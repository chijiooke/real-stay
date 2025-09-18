// src/upload/file-upload.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';
import * as formidable from 'formidable';
import { MailgunService } from '../features/notifications/mail/mailgun/mailgun.service'; 
// 👆 Or cleaner with tsconfig paths: import { MailgunService } from '@mailgun/mailgun.service';

@Injectable()
export class UtilityService {
  constructor(
    private readonly mailService: MailgunService, // injected from MailgunModule
    private readonly configService: ConfigService,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFromRequest(req: Request) {
    const form = new formidable.IncomingForm({
      multiples: false,
      keepExtensions: true,
    });

    const [, files] = await form.parse(req);
    const file = files['file'] as formidable.File;

    if (!file || !file[0]?.filepath) {
      throw new Error('No file uploaded');
    }

    const uploadResult = await cloudinary.uploader.upload(file[0].filepath, {
      folder: 'chat_files',
      resource_type: 'auto',
      public_id: `${Date.now()}-${file[0]?.originalFilename}`,
    });

    return {
      url: uploadResult.secure_url,
      fileType: uploadResult.resource_type,
    };
  }

  async testEmail() {
    await this.mailService.sendTemplateEmail({
      from: 'Real Stay <hello@edgetechino.com>',
      to: 'chijiooke234@yopmail.com',
      subject: 'Reset your password',
      templateName: 'forgot-password',
      context: { otp: '12345' },
    });
  }
}
