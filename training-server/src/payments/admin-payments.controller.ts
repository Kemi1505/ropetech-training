import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { PaymentQueryDto, RejectPaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '../common/api-auth.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type AuthUser } from '../auth/types';

@ApiTags('Payments (admin)')
@ApiAuth()
@Roles(Role.ADMIN) // admin or superadmin
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private payments: PaymentsService) {}

  @ApiOperation({ summary: 'Submitted payments. Use ?status=PENDING for the ones waiting for you.' })
  @Get()
  list(@Query() q: PaymentQueryDto) {
    return this.payments.list(q);
  }

  @ApiOperation({ summary: 'Approve a payment: unlocks the course for the learner' })
  @HttpCode(200)
  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() me: AuthUser) {
    return this.payments.approve(id, me.id);
  }

  @ApiOperation({ summary: 'Reject a payment (optional reason). The learner can submit again.' })
  @HttpCode(200)
  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectPaymentDto, @CurrentUser() me: AuthUser) {
    return this.payments.reject(id, me.id, dto.reason);
  }
}
