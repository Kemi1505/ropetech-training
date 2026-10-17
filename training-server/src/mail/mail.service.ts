import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private config: ConfigService) {
    const user = config.getOrThrow<string>('MAIL_USER');
    const appName = config.get<string>('MAIL_APP_NAME') ?? 'Training Platform';

    this.from = `"${appName}" <${user}>`;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass: config.getOrThrow<string>('MAIL_APP_PASSWORD') },
    });
  }

  async sendPasswordResetOtp(to: string, otp: string) {
    await this.send({
      to,
      subject: 'Your password reset code',
      text: `Your password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2>Password reset</h2>
        <p>Use this code to reset your password:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${otp}</p>
        <p>It expires in <b>10 minutes</b>. If you didn't request this, ignore this email.</p>
      </div>`,
    });
  }

  /** Sent to ADMIN_ENQUIRY_EMAIL. Reply-To is the sender, so the admin can just hit "Reply". */
  async sendEnquiry(e: { name: string; email: string; text: string }) {
    const name = e.name.replace(/[\r\n]+/g, ' ').trim();
    await this.send({
      to: this.config.getOrThrow<string>('ADMIN_ENQUIRY_EMAIL'),
      replyTo: e.email,
      subject: `New enquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${e.email}\n\n${e.text}`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:560px">
        <h2>New enquiry</h2>
        <p><b>Name:</b> ${escapeHtml(name)}<br><b>Email:</b> ${escapeHtml(e.email)}</p>
        <p style="white-space:pre-wrap">${escapeHtml(e.text)}</p>
      </div>`,
    });
  }

  private async send(opts: MailOptions) {
    try {
      await this.transporter.sendMail({ from: this.from, ...opts });
    } catch (err) {
      this.logger.error(`Failed to send "${opts.subject}" to ${opts.to}`, err as Error);
      throw new InternalServerErrorException('Could not send email. Please try again later.');
    }
  }
}
  