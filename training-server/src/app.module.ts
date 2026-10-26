import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AdminModule } from './admin/admin.module';
import { CoursesModule } from './courses/courses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EnquiryModule } from './enquiry/enquiry.module';
import { FilesModule } from './files/files.module';
import { ProfileModule } from './profile/profile.module';
import { AssessmentModule } from './assessment/assessment.module';
import { PaymentsModule } from './payments/payments.module';
import { LessonsModule } from './lessons/lessons.module';
import { MeModule } from './me/me.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './storage/storage.module';

const REQUIRED_ENV = [
  'DATABASE_URL',
  'FRONTEND_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'MAIL_USER',
  'MAIL_APP_PASSWORD',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'ADMIN_ENQUIRY_EMAIL',
  'PAYMENT_BANK_NAME',
  'PAYMENT_ACCOUNT_NUMBER',
  'PAYMENT_ACCOUNT_NAME',
  'APP_BASE_URL',
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env: Record<string, unknown>) => {
        const missing = REQUIRED_ENV.filter((k) => !env[k]);
        if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
        return env;
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), // default: 100 req/min per IP
    PrismaModule,
    MailModule,
    UsersModule,
    AuthModule,
    AdminModule,
    CoursesModule,
    DashboardModule,
    EnquiryModule,
    FilesModule,
    ProfileModule,
    AssessmentModule,
    PaymentsModule,
    LessonsModule,
    MeModule,
    NotificationsModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [
    // Order matters: throttle -> authenticate -> authorize
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    AppService
  ],
})
export class AppModule {}
