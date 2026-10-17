import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PublicEnquiryDto, UserEnquiryDto } from './dto/enquiry.dto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const RESPONSE = { message: 'Thank you for reaching out. A response will be sent to your email soon.' };

@Injectable()
export class EnquiryService {
  constructor(
    private mail: MailService,
    private prisma: PrismaService,
  ) {}

  async submitPublic(dto: PublicEnquiryDto) {
    await this.mail.sendEnquiry({ name: dto.name, email: dto.email, text: dto.text });
    return RESPONSE;
  }

  /** Name and email come from the database, never from the request. */
  async submitAsUser(userId: string, dto: UserEnquiryDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException();

    const name = user.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user.email;

    await this.mail.sendEnquiry({
      name,
      email: user.email,
      text: dto.text,
    });

    return RESPONSE;
  }
}