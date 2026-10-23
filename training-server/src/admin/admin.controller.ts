import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiAuth } from '../common/api-auth.decorator';
import { PaginationDto } from '../common/pagination.dto';
import { FilesService } from '../files/files.service';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { EnrollmentQueryDto } from './dto/enrollment-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type AuthUser } from '../auth/types';

@ApiTags('Admin')
@ApiAuth()
@Roles(Role.ADMIN) 
// default for this controller: admin or superadmin. Methods below override it.
@Controller('admin')
export class AdminController {
  constructor(
    private admin: AdminService,
    private files: FilesService,
  ) {}

  // ---- superadmin only
  @ApiOperation({ summary: 'Create an admin (superadmin only)' })
  @Roles(Role.SUPERADMIN)
  @Post('create-admin')
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.admin.createAdmin(dto);
  }

  @ApiOperation({ 
    summary: 'Promote an admin to superadmin: the only permitted role change (superadmin only)' })
  @Roles(Role.SUPERADMIN)
  @Patch('admins/:id/promote')
  promote(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.promoteToSuperadmin(id);
  }

  @ApiOperation({ summary: 'View all admins and superadmins (superadmin only)' })
  @Roles(Role.SUPERADMIN)
  @Get('admins')
  listAdmins(@Query() q: PaginationDto) {
    return this.admin.listAdmins(q);
  }

  // ---- admin or superadmin
  @ApiOperation({ summary: 'View all users (learners)' })
  @Get('users')
  listUsers(@Query() q: PaginationDto) {
    return this.admin.listUsers(q);
  }

  @ApiOperation({ summary: 'List enrollments, e.g. ?paymentStatus=PENDING to find payments to approve' })
  @Get('enrollments')
  listEnrollments(@Query() q: EnrollmentQueryDto) {
    return this.admin.listEnrollments(q);
  }

  @ApiOperation({ summary: 'Certification files waiting for approval' })
  @Get('certifications/pending')
  pendingCertifications(@Query() q: PaginationDto) {
    return this.admin.listPendingCertifications(q);
  }

  @ApiOperation({ summary: "View a user's uploaded certification file" })
  @Get('users/:userId/certification-file')
  async certificationFile(
    @Param('userId', ParseUUIDPipe) userId: string, 
    @Res({ passthrough: true }) 
    res: Response) {
    return this.files.stream(
      await this.admin.certificationFileId(userId), 
      res, 
      { cache: 'private' });
  }

  @ApiOperation({ summary: "Approve a user's uploaded certification" })
  @HttpCode(200)
  @Post('users/:userId/approve-certification')
  approveCertification(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.admin.approveCertification(userId);
  }
}
