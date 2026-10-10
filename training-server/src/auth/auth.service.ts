import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
//import { AuthMethod, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GoogleProfile } from './types';
import { toPublicUser ,UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { AuthMethod } from '../generated/enums';
import { User } from '../generated/client';

const BCRYPT_ROUNDS = 12;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const safeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: ReturnType<typeof toPublicUser>;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  get accessTtl() {
    return Number(this.config.get('ACCESS_TTL_SECONDS') );
  }
  get refreshTtl() {
    return Number(this.config.get('REFRESH_TTL_SECONDS') ?? 604800);
  }

  // ---------------------------------------------------------------- register
  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.users.create({
      email: dto.email,
      password: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      authType: AuthMethod.EMAIL_AND_PASSWORD,
      // role is never taken from the request: always USER
    });
    return toPublicUser(user);
  }

  // ------------------------------------------------------------------- login
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    if (!user.password) {
      throw new UnauthorizedException('Please sign in with your Google Account.');
    }
    if (!(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) throw new ForbiddenException('Account disabled');

    return this.issueTokens(user);
  }

  // ----------------------------------------------------------- google login
  async googleLogin(profile: GoogleProfile): Promise<AuthResult> {
    let user = await this.users.findByGoogleId(profile.googleId);

    if (!user) {
      const existing = await this.users.findByEmail(profile.email);
      if (existing) {
        // Account linking: same (Google-verified) email -> attach Google to the existing account
        user = await this.users.linkGoogle(existing.id, profile.googleId);
      } else {
        user = await this.users.create({
          email: profile.email,
          authType: AuthMethod.GOOGLE,
          googleId: profile.googleId,
        });
      }
    }
    if (!user.isActive) throw new ForbiddenException('Account disabled');
    return this.issueTokens(user);
  }

  // ----------------------------------------------------------------- refresh
  async refresh(token?: string): Promise<AuthResult> {
    if (!token) throw new UnauthorizedException('Missing refresh token');

    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored || !safeEqual(stored.tokenHash, sha256(token))) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotation: delete the old token. deleteMany makes a double-use race fail safely.
    const { count } = await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
    if (count === 0) throw new UnauthorizedException('Invalid or expired refresh token');

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException();
    return this.issueTokens(user);
  }

  // ------------------------------------------------------------------ logout
  /** Removes this session's refresh token. Works even if the access token has expired. */
  async logout(token?: string) {
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<{ jti: string }>(token, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        ignoreExpiration: true,
      });
      await this.prisma.refreshToken.deleteMany({ where: { id: payload.jti } });
    } catch {
      // invalid token: nothing to remove
    }
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return toPublicUser(user);
  }

  // --------------------------------------------------------- forgot password
  async forgotPassword({ email }: ForgotPasswordDto) {
    const generic = { message: 'A 6-digit code has been sent to your registered email.' };

    const user = await this.users.findByEmail(email);
    if (!user) return generic; // don't reveal which emails exist

    if (!user.password) {
      throw new BadRequestException(
        'This account uses Google sign-in, Please sign in with Google.',
      );
    }

    const last = await this.prisma.passwordResetOtp.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      throw new HttpException('Please wait a minute before requesting another code', HttpStatus.TOO_MANY_REQUESTS);
    }

    const otp = String(randomInt(100000, 1000000)); // cryptographically secure 6 digits
    await this.prisma.$transaction([
      this.prisma.passwordResetOtp.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetOtp.create({
        data: {
          userId: user.id,
          otpHash: await bcrypt.hash(otp, 10),
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
        },
      }),
    ]);

    await this.mail.sendPasswordResetOtp(user.email, otp);
    return generic;
  }

  async verifyOtp(dto: VerifyOtpDto) {
    await this.assertValidOtp(dto.email, dto.otp);
    return { message: 'Code is valid' };
  }

  // ---------------------------------------------------------- reset password
  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const user = await this.assertValidOtp(dto.email, dto.otp);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) },
      }),
      this.prisma.passwordResetOtp.deleteMany({ where: { userId: user.id } }), // single use
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }), // log out everywhere
    ]);
    return { message: 'Password reset successful. Please log in.' };
  }

  // ----------------------------------------------------------------- helpers
  private async assertValidOtp(email: string, otp: string): Promise<User> {
    const invalid = new BadRequestException('Invalid or expired code');

    const user = await this.users.findByEmail(email);
    if (!user) throw invalid;

    const record = await this.prisma.passwordResetOtp.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw invalid;

    if (record.expiresAt < new Date() || record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.passwordResetOtp.deleteMany({ where: { userId: user.id } });
      throw invalid;
    }

    if (!(await bcrypt.compare(otp, record.otpHash))) {
      await this.prisma.passwordResetOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw invalid;
    }
    return user;
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    // housekeeping: drop this user's expired refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: this.accessTtl },
    );

    const tokenId = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.refreshTtl,
        jwtid: tokenId,
      },
    );

    // sha256 (not bcrypt): bcrypt only reads the first 72 bytes, and a JWT is longer than that
    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}
