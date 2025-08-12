// src/upload/file-upload.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';
import * as formidable from 'formidable';
import { MailService } from 'src/utility-services/mail.service';

@Injectable()
export class UtilityService {
  constructor(
    private readonly mailService: MailService,
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
      to: 'silva.chijioke.michael@gmail.com',
      subject: 'Welcome to Real Stay!',
      templateName: 'welcome',
      replacements: { name: 'Edge Tech' },
    });
  }
}
