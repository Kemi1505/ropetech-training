import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/types';
import { ApiAuth } from '../common/api-auth.decorator';
import { PaginationDto } from '../common/pagination.dto';
import { FilesService } from '../files/files.service';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { EnrollmentQueryDto } from './dto/enrollment-query.dto';
import { CertificationQueryDto, RejectCertificationDto, UsersQueryDto } from './dto/users-query.dto';
import { Role } from '../generated/enums';

@ApiTags('Admin')
@ApiAuth()
@Roles(Role.ADMIN) // default for this controller: admin or superadmin. Methods below override it.
@Controller('admin')
export class AdminController {
  constructor(
    private admin: AdminService,
    private files: FilesService,
  ) {}

  // ----------------------------------------------------------- superadmin only
  @ApiOperation({ summary: 'Create an admin with just an email and a temporary password (superadmin only)' })
  @Roles(Role.SUPERADMIN)
  @Post('admins')
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.admin.createAdmin(dto);
  }

  @ApiOperation({ summary: 'Promote an admin to superadmin: the only permitted role change (superadmin only)' })
  @Roles(Role.SUPERADMIN)
  @Patch('admins/:id/promote')
  promote(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.promoteToSuperadmin(id);
  }

  @ApiOperation({ summary: 'Deactivate an admin. This deletes the account. A superadmin cannot be removed (superadmin only)' })
  @Roles(Role.SUPERADMIN)
  @Delete('admins/:id')
  removeAdmin(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() me: AuthUser) {
    return this.admin.removeAdmin(id, me.id);
  }

  @ApiOperation({ summary: 'View all admins and superadmins (superadmin only)' })
  @Roles(Role.SUPERADMIN)
  @Get('admins')
  listAdmins(@Query() q: PaginationDto) {
    return this.admin.listAdmins(q);
  }

  // ------------------------------------------------------ admin or superadmin
  @ApiOperation({ summary: 'Learners. Supports ?search= and ?certification=NONE|PENDING|APPROVED|REJECTED' })
  @Get('users')
  listUsers(@Query() q: UsersQueryDto) {
    return this.admin.listUsers(q);
  }

  @ApiOperation({ summary: 'One learner with their enrollments (the side panel)' })
  @Get('users/:id')
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getUser(id);
  }

  @ApiOperation({ summary: 'Enrollments. Supports ?paymentStatus=, ?courseId= and ?search=' })
  @Get('enrollments')
  listEnrollments(@Query() q: EnrollmentQueryDto) {
    return this.admin.listEnrollments(q);
  }

  @ApiOperation({ summary: 'Numbers for the certification tabs' })
  @Get('certifications/counts')
  certificationCounts() {
    return this.admin.certificationCounts();
  }

  @ApiOperation({ summary: 'Uploaded certifications. ?status=PENDING (default), APPROVED or REJECTED' })
  @Get('certifications')
  listCertifications(@Query() q: CertificationQueryDto) {
    return this.admin.listCertifications(q.status ?? 'PENDING', q);
  }

  @ApiOperation({ summary: "View a learner's uploaded certification file" })
  @Get('users/:userId/certification-file')
  async certificationFile(@Param('userId', ParseUUIDPipe) userId: string, @Res({ passthrough: true }) res: Response) {
    return this.files.stream(await this.admin.certificationFileId(userId), res, { cache: 'private' });
  }

  @ApiOperation({ summary: "Approve a learner's certification" })
  @HttpCode(200)
  @Post('users/:userId/approve-certification')
  approveCertification(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.admin.approveCertification(userId);
  }

  @ApiOperation({ summary: "Reject a learner's certification with a reason (the learner is emailed and notified)" })
  @HttpCode(200)
  @Post('users/:userId/reject-certification')
  rejectCertification(@Param('userId', ParseUUIDPipe) userId: string, @Body() dto: RejectCertificationDto) {
    return this.admin.rejectCertification(userId, dto.reason);
  }
}
