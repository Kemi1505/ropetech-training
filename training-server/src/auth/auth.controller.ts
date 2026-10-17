import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CookieOptions, type Request, type Response } from 'express';
import { AuthResult, AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { type AuthUser, GoogleProfile } from './types';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/auth'; // refresh cookie is only sent to /auth/* routes

const strict = (limit: number) => Throttle({ default: { limit, ttl: 60_000 } });

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private config: ConfigService,
  ) {}

  // ---------------------------------------------------------------- register
  @ApiOperation({ summary: 'Register with email and password' })
  @Public()
  @strict(5)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // ------------------------------------------------------------------- login
  @ApiOperation({ summary: 'Log in: returns tokens and sets httpOnly cookies' })
  @Public()
  @strict(5)
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    this.setAuthCookies(res, result);
    return result;
  }

  // ----------------------------------------------------------------- refresh
  @ApiOperation({ summary: 'Rotate tokens using the refresh cookie (or body)' })
  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? dto.refreshToken;
    const result = await this.auth.refresh(token);
    this.setAuthCookies(res, result);
    return result;
  }

  // ------------------------------------------------------------------ logout
  @ApiOperation({ summary: 'Log out: deletes the refresh token and clears cookies' })
  @Public()
  @HttpCode(200)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE] ?? dto.refreshToken);
    this.clearAuthCookies(res);
    return { message: 'Logged out' };
  }

  @ApiOperation({ summary: 'Log out of all devices' })
  @ApiBearerAuth()
  @ApiCookieAuth(ACCESS_COOKIE)
  @HttpCode(200)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logoutAll(user.id);
    this.clearAuthCookies(res);
    return { message: 'Logged out of all devices' };
  }

  @ApiOperation({ summary: 'Current user' })
  @ApiBearerAuth()
  @ApiCookieAuth(ACCESS_COOKIE)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  // ---------------------------------------------------------- password reset
  @ApiOperation({ summary: 'Send a 6-digit OTP to the email (also used to resend)' })
  @Public()
  @strict(3)
  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @ApiOperation({ summary: 'Check an OTP without using it' })
  @Public()
  @strict(5)
  @HttpCode(200)
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @ApiOperation({ summary: 'Confirm OTP and set a new password' })
  @Public()
  @strict(5)
  @HttpCode(200)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  // ------------------------------------------------------------------ google
  @ApiOperation({ summary: 'Start Google sign-in (open in the browser, redirects to Google)' })
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {
    // GoogleAuthGuard redirects to Google; this body never runs
  }

  @ApiOperation({ summary: 'Google redirects here; sets cookies then redirects to the frontend' })
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request & { user: GoogleProfile }, @Res() res: Response) {
    const result = await this.auth.googleLogin(req.user);
    this.setAuthCookies(res, result);
    res.redirect(`${this.config.getOrThrow('FRONTEND_URL')}/auth/google/success`);
  }

  // ----------------------------------------------------------------- cookies
  private get refreshPath() {
    return this.config.get<string>('REFRESH_COOKIE_PATH') ?? '/auth';
  }

  private baseCookie(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: (this.config.get('COOKIE_SAMESITE') ?? 'lax') as 'lax' | 'strict' | 'none',
    };
  }

  private setAuthCookies(res: Response, tokens: AuthResult) {
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...this.baseCookie(),
      path: '/',
      maxAge: this.auth.accessTtl * 1000,
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.baseCookie(),
      path: this.refreshPath,
      maxAge: this.auth.refreshTtl * 1000,
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { ...this.baseCookie(), path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...this.baseCookie(), path: this.refreshPath });
  }
}
