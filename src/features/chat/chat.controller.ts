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
import { Request } from 'express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwtAuthGuard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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
  async getConversation(@Req() req: Request, @Param('userId') userId: string) {
    const me = req.user as { _id: string };
    return this.chatService.getConversation(me._id.toString(), userId);
  }

  // 📖 Get chat history
  @UseGuards(JwtAuthGuard)
  @Get('messages')
  async getConversations(@Req() req: Request) {
    const me = req.user as { _id: string };

    return this.chatService.getConversations(me._id.toString());
  }
}
