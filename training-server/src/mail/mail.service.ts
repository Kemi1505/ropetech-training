import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const user = config.getOrThrow<string>('MAIL_USER');
    const appName = config.get<string>('MAIL_APP_NAME') ?? 'Training Platform';

    this.from = `"${appName}" <${user}>`;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass: config.getOrThrow<string>('MAIL_APP_PASSWORD') },
    });
  }

  async sendPasswordResetOtp(to: string, otp: string) {
    await this.send(
      to,
      'Your password reset code',
      `Your password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2>Password reset</h2>
        <p>Use this code to reset your password:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${otp}</p>
        <p>It expires in <b>10 minutes</b>. If you didn't request this, ignore this email.</p>
      </div>`,
    );
  }

  private async send(to: string, subject: string, text: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, html });
    } catch (err) {
      this.logger.error(`Failed to send "${subject}" to ${to}`, err as Error);
      throw new InternalServerErrorException('Could not send email. Please try again later.');
    }
  }
}
