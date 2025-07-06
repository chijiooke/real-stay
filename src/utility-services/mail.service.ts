// src/utility-services/mail.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as handlebars from 'handlebars';
import { MailgunService } from 'nestjs-mailgun';
import { MailgunMessageData } from 'nestjs-mailgun';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mailgunService: MailgunService;
  private readonly domain: string;
  private readonly from: string;

  constructor() {
    this.ensureEnvVars(['MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'MAILGUN_FROM']);

    this.domain = process.env.MAILGUN_DOMAIN!;
    this.from = process.env.MAILGUN_FROM!;

    this.mailgunService = new MailgunService({
      username: 'api',
      key: process.env.MAILGUN_API_KEY!,
      url: process.env.MAILGUN_API_URL || 'https://api.mailgun.net',
    });
  }

  private ensureEnvVars(keys: string[]) {
    const missing = keys.filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
  }

  private async renderTemplate(
    templateName: string,
    replacements: Record<string, string>,
  ): Promise<string> {
    const basePath = process.env.NODE_ENV === 'production' ? 'dist' : 'src';
    const filePath = join(basePath, 'email-templates', `${templateName}.html`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const compiled = handlebars.compile(content);
      return compiled(replacements);
    } catch (err) {
      this.logger.error(`Error rendering template "${templateName}"`, err);
      throw new InternalServerErrorException('Failed to render email template');
    }
  }

  async sendTemplateEmail(options: {
    to: string;
    subject: string;
    templateName: string;
    replacements: Record<string, string>;
    cc?: string | string[];
    bcc?: string | string[];
    text?: string;
  }): Promise<void> {
    const { to, subject, templateName, replacements, cc, bcc, text } = options;

    try {
      const html = await this.renderTemplate(templateName, replacements);

      const message: MailgunMessageData = {
        from: this.from,
        to,
        subject,
        html,
        text,
        cc,
        bcc,
        'h:X-Mailgun-Variables': JSON.stringify(replacements),
        'o:testmode': 'no',
      };

      const result = await this.mailgunService.createEmail(this.domain, message);
      this.logger.log(`✅ Email sent to ${to}. ID: ${result.id}`);
    } catch (err) {
      this.logger.error(`❌ Failed to send email to ${to}`, err);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
