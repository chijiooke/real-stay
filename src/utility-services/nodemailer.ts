import { Injectable, InternalServerErrorException } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import 'dotenv/config';

@Injectable()
export class MailService {
  private transporter: Transporter;

  constructor() {
    this.validateEnvVariables();

    this.transporter = (
      nodemailer as unknown as {
        createTransport: typeof nodemailer.createTransport;
      }
    ).createTransport({
      host: process.env.MAILER_HOST,
      port: Number(process.env.MAILER_PORT),
      secure: false,
      auth: {
        user: process.env.BREVO_EMAIL,
        pass: process.env.BREVO_API_KEY,
      },
    });
  }

  private validateEnvVariables(): void {
    const requiredVars = [
      'MAILER_HOST',
      'MAILER_PORT',
      'BREVO_EMAIL',
      'BREVO_API_KEY',
    ];
    const missingVars = requiredVars.filter((key) => !process.env[key]);

    if (missingVars.length) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`,
      );
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    options: { text?: string; html?: string },
  ): Promise<void> {
    try {
      const mailOptions = {
        from: `"RealStay" <${process.env.BREVO_EMAIL}>`,
        to,
        subject,
        text: options.text, // Plain text (optional)
        html: options.html, // HTML template (optional)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(
        `✅ Email sent to ${to}: ${info?.messageId || 'no message ID'}`,
      );
    } catch (error) {
      console.error(`❌ Error sending email to ${to}:`, error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
