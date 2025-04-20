import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import * as cloudinary from 'cloudinary';
import { Request } from 'express';
import * as formidable from 'formidable';
import { JwtAuthGuard } from 'src/auth/jwtAuthGuard';
import { ChatService } from './chat.service';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // 🔐 Protected route
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  async uploadFile(@Req() req: Request): Promise<unknown> {
    const form = new formidable.IncomingForm({
      multiples: false,
      keepExtensions: true,
    });

    const [, files] = await form.parse(req);

    // Get the file (safe access for single file)
    const file = files['file'] as formidable.File;

    if (!file || !file[0]?.filepath) {
      throw new Error('No file uploaded');
    }

    const uploadResult = await cloudinary.v2.uploader.upload(
      file[0]?.filepath,
      {
        folder: 'chat_files',
        resource_type: 'auto',
        public_id: `${Date.now()}-${file[0]?.originalFilename}`,
      },
    );

    return {
      url: uploadResult.secure_url,
      fileType: uploadResult.resource_type,
    };
  }

  // 💬 Send message via REST (optional fallback/test)
  @UseGuards(JwtAuthGuard)
  @Post('message')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendMessage(@Req() req: Request, @Body() body: any) {
    const sender = req.user as { id: string };
    const { receiverId, content, fileUrl, fileType } = body;

    const message = await this.chatService.saveMessage(
      sender?.id,
      receiverId,
      content,
      fileUrl,
      fileType,
    );

    return message;
  }

  // 📥 Mark as read (REST fallback)
  @UseGuards(JwtAuthGuard)
  @Post('read')
  async markAsRead(@Req() req: Request, @Body() body: { senderId: string }) {
    const sender = req.user as { id: string };
    const updated = await this.chatService.markMessageAsRead(
      sender?.id,
      body?.senderId,
      new Date(),
    );
    if (!updated) throw new NotFoundException('Message not found');
    return updated;
  }

  // 📖 Get chat history
  @UseGuards(JwtAuthGuard)
  @Get('messages/:userId')
  async getChatHistory(@Req() req: Request, @Param('userId') userId: string) {
    const me = req.user as { _id: string };

    console.log({ me });
    return this.chatService.getConversation(me._id.toString(), userId);
  }
}
