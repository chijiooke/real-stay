// src/upload/file-upload.service.ts
import { Injectable } from '@nestjs/common';
import * as cloudinary from 'cloudinary';
import { Request } from 'express';
import * as formidable from 'formidable';
// import { promisify } from 'util';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class UtilityService {
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

    const uploadResult = await cloudinary.v2.uploader.upload(file[0].filepath, {
      folder: 'chat_files',
      resource_type: 'auto',
      public_id: `${Date.now()}-${file[0]?.originalFilename}`,
    });

    return {
      url: uploadResult.secure_url,
      fileType: uploadResult.resource_type,
    };
  }
}
