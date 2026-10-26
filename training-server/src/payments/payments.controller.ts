import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';
import { ApiAuth } from '../common/api-auth.decorator';
import { SubmitPaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiAuth()
@Controller('courses/:courseId/payment')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @ApiOperation({ summary: 'Bank account, amount due, steps, and your payment status for this course' })
  @Get()
  instructions(@CurrentUser() user: AuthUser, @Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.payments.instructions(user, courseId);
  }

  @ApiOperation({ summary: '"I have paid": name on the transfer + amount sent. Emails the admin.' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  submit(
    @CurrentUser() user: AuthUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: SubmitPaymentDto,
  ) {
    return this.payments.submit(user, courseId, dto);
  }
}
