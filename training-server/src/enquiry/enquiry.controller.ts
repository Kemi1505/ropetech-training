import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiAuth } from '../common/api-auth.decorator';
import { PublicEnquiryDto, UserEnquiryDto } from './dto/enquiry.dto';
import { EnquiryService } from './enquiry.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type AuthUser } from '../auth/types';

@ApiTags('Enquiries')
@Controller('enquiries')
export class EnquiryController {
  constructor(private enquiries: EnquiryService) {}

  @ApiOperation({ summary: 'Anyone can send an enquiry (name, email, text)' })
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // public + sends email: keep it tight
  @HttpCode(200)
  @Post('public')
  submitPublic(@Body() dto: PublicEnquiryDto) {
    return this.enquiries.submitPublic(dto);
  }

  @ApiOperation({ summary: 'Logged-in users send just the text; name and email come from their account' })
  @ApiAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post()
  submit(@CurrentUser() user: AuthUser, @Body() dto: UserEnquiryDto) {
    return this.enquiries.submitAsUser(user.id, dto);
  }
}
