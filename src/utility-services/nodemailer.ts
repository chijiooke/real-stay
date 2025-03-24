import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import * as handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { join } from 'path';

dotenv.config();

@Injectable()
export class MailService {
  private transporter: Transporter;

  constructor() {
    this.validateEnvVariables();

    this.transporter = nodemailer.createTransport({
      host: process.env.MAILER_HOST,
      port: Number(process.env.MAILER_PORT),
      secure: false, // Set to true for TLS
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

  loadTemplate = async (filename: string): Promise<string> => {
    try {
      const filePath = join(__dirname, '..', 'email-templates', filename);
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error('Error loading email template:', error);
      throw new Error('Could not load email template');
    }
  };

  /**
   * Reads and compiles an HTML email template.
   * @param templateName - Name of the template file (without `.html` extension).
   * @param replacements - Dynamic data to replace in the template.
   * @returns Rendered HTML string.
   */
  private async renderTemplate(
    templateName: string,
    replacements: Record<string, string>,
  ): Promise<string> {
    try {
      const templatePath = join(
        process.env.NODE_ENV === 'production' ? 'dist' : 'src',
        'email-templates',
        `${templateName}.html`,
      );

      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateContent);
      return compiledTemplate(replacements);
    } catch (error) {
      console.error(`❌ Error loading email template:`, error);
      throw new InternalServerErrorException('Failed to load email template');
    }
  }

  /**
   * Sends an email using the configured SMTP service.
   * @param to - Recipient's email address.
   * @param subject - Email subject.
   * @param templateName - Name of the HTML template file (without `.html`).
   * @param replacements - Dynamic values to insert into the template.
   */
  async sendTemplateEmail(
    to: string,
    subject: string,
    templateName: string,
    replacements: Record<string, string>,
  ): Promise<void> {
    try {
      const htmlContent = await this.renderTemplate(templateName, replacements);

      console.log('htmlContent', htmlContent);

      const mailOptions = {
        from: process.env.BREVO_EMAIL,
        to,
        subject,
        html: htmlContent, // Rendered HTML
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(
        `✅ Email sent to ${to}: ${JSON.stringify(info) || 'No message ID'}`,
      );
    } catch (error) {
      console.error(`❌ Error sending email to ${to}:`, error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
