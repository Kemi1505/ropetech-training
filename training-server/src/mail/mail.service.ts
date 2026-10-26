import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

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
      subject: `New Enquiry from ${name}`,
      text: `Email: ${e.email}\n\n${e.text}`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:560px">
        <h2>New enquiry</h2>
        <p>You have a new enquiry from ${escapeHtml(name)}</p>
        <p><b>Email:</b> ${escapeHtml(e.email)}</p>
        <p style="white-space:pre-wrap">${escapeHtml(e.text)}</p>
      </div>`,
    });
  }

  
  /** Sent to ADMIN_PAYMENT_EMAIL (falls back to ADMIN_ENQUIRY_EMAIL) when a learner says they have paid. */
  async sendPaymentSubmitted(p: {
    learnerName: string;
    learnerEmail: string;
    courseName: string;
    payerName: string;
    amountSent: string;
    expectedAmount: string;
  }) {
    const to = this.config.get<string>('ADMIN_PAYMENT_EMAIL') ?? this.config.getOrThrow<string>('ADMIN_ENQUIRY_EMAIL');
    const clean = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();
    const rows: [string, string][] = [
      ['Learner', `${clean(p.learnerName)} (${p.learnerEmail})`],
      ['Course', clean(p.courseName)],
      ['Name on transfer', clean(p.payerName)],
      ['Amount sent', p.amountSent],
      ['Course price', p.expectedAmount],
    ];
    await this.send({
      to,
      replyTo: p.learnerEmail,
      subject: `Payment submitted: ${clean(p.courseName)}`,
      text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nCheck your bank account, then approve or reject it on the admin payments page.`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:560px">
        <h2>Payment submitted</h2>
        <table cellpadding="6" style="border-collapse:collapse">
          ${rows.map(([k, v]) => `<tr><td><b>${escapeHtml(k)}</b></td><td>${escapeHtml(v)}</td></tr>`).join('')}
        </table>
        <p>Check your bank account, then approve or reject it on the admin payments page.</p>
      </div>`,
    });
  }

  /** To the learner, at the address stored in the database. */
  async sendPaymentApproved(p: { to: string; firstName: string | null; courseName: string; courseUrl: string }) {
    const hi = p.firstName ? `Hi ${oneLine(p.firstName)},` : 'Hello,';
    const course = oneLine(p.courseName);
    await this.send({
      to: p.to,
      subject: `Payment approved: ${course}`,
      text: `${hi}\n\nYour payment for "${course}" has been approved. You can start learning now:\n${p.courseUrl}\n`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:480px">
        <h2>Payment approved</h2>
        <p>${escapeHtml(hi)}</p>
        <p>Your payment for <b>${escapeHtml(course)}</b> has been approved. You can start learning now.</p>
        <p><a href="${escapeHtml(p.courseUrl)}">Open the course</a></p>
      </div>`,
    });
  }

  async sendPaymentRejected(p: {
    to: string;
    firstName: string | null;
    courseName: string;
    courseUrl: string;
    reason: string | null;
  }) {
    const hi = p.firstName ? `Hi ${oneLine(p.firstName)},` : 'Hello,';
    const course = oneLine(p.courseName);
    const reason = p.reason ? oneLine(p.reason) : null;
    await this.send({
      to: p.to,
      subject: `Payment not approved: ${course}`,
      text: `${hi}\n\nWe could not approve your payment for "${course}".${reason ? `\nReason: ${reason}` : ''}\n\nPlease check the details and submit your payment again:\n${p.courseUrl}\n`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:480px">
        <h2>Payment not approved</h2>
        <p>${escapeHtml(hi)}</p>
        <p>We could not approve your payment for <b>${escapeHtml(course)}</b>.</p>
        ${reason ? `<p><b>Reason:</b> ${escapeHtml(reason)}</p>` : ''}
        <p>Please check the details and <a href="${escapeHtml(p.courseUrl)}">submit your payment again</a>.</p>
      </div>`,
    });
  }

  async sendCertificationRejected(p: { to: string; firstName: string | null; reason: string; profileUrl: string }) {
    const hi = p.firstName ? `Hi ${oneLine(p.firstName)},` : 'Hello,';
    const reason = oneLine(p.reason);
    await this.send({
      to: p.to,
      subject: 'Your previous certification was not approved',
      text: `${hi}\n\nWe could not approve the certification you uploaded.\nReason: ${reason}\n\nYou can upload a new file here:\n${p.profileUrl}\n`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:480px">
        <h2>Certification not approved</h2>
        <p>${escapeHtml(hi)}</p>
        <p>We could not approve the certification you uploaded.</p>
        <p><b>Reason:</b> ${escapeHtml(reason)}</p>
        <p><a href="${escapeHtml(p.profileUrl)}">Upload a new file</a> from your profile.</p>
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
  