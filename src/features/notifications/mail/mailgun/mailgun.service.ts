import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import * as path from 'path';
import * as FormData from 'form-data';

@Injectable()
export class MailgunService {
  private readonly logger = new Logger(MailgunService.name);

  private readonly apiKey: string;
  private readonly domain: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('MAILGUN_API_KEY') || '';
    this.domain = this.config.get<string>('MAILGUN_DOMAIN') || '';
    this.baseUrl =
      this.config.get<string>('MAILGUN_API_URL') ||
      'https://api.mailgun.net/v3';
  }

  /**
   * Send email using a Handlebars template
   */
  async sendTemplateEmail(options: {
    from: string;
    to: string;
    subject: string;
    templateName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context?: Record<string, any>;
    attachments?: { filename: string; path: string }[];
  }): Promise<void> {
    try {
      const url = `${this.baseUrl}/${this.domain}/messages`;

      // 1. Compile HTML template
      const templatePath = path.resolve(
        process.cwd(),
        'src/features/notifications/mail/email-templates',
        `${options.templateName}.html`,
      );

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
      }

      const templateSrc = fs.readFileSync(templatePath, 'utf8');
      const template = Handlebars.compile(templateSrc);
      const html = template(options.context || {});

      // Plain-text fallback (basic strip of HTML tags)
      const text = html.replace(/<[^>]+>/g, '');

      // 2. Build form-data
      const formData = new FormData();
      formData.append('from', options.from);
      formData.append('to', options.to);
      formData.append('subject', options.subject);
      formData.append('html', html);
      formData.append('text', text);

      // Attachments
      if (options.attachments) {
        for (const file of options.attachments) {
          if (fs.existsSync(file.path)) {
            const fileStream = fs.createReadStream(file.path);
            formData.append('attachment', fileStream, file.filename);
          } else {
            this.logger.warn(`Attachment not found: ${file.path}`);
          }
        }
      }

      // 3. Send request
      await axios.post(url, formData, {
        auth: {
          username: 'api',
          password: this.apiKey,
        },
        headers: formData.getHeaders(),
      });

      this.logger.log(`✅ Email sent to ${options.to}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send email to ${options.to}: ${
          error.response?.data
            ? JSON.stringify(error.response.data)
            : error.message
        }`,
      );
      throw error;
    }
  }
}
