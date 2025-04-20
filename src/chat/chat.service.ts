import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from './message.schema';
import { Model } from 'mongoose';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async saveMessage(senderId, receiverId, content, fileUrl?, fileType?) {
    return this.messageModel.create({
      senderId: senderId,
      receiverId: receiverId,
      content,
      fileUrl,
      fileType,
      read: false,
      timestamp: new Date(),
    });
  }

  async markMessageAsRead(
    receiverId: string,
    senderid: string,
    timestamp: Date,
  ) {
    console.log({ receiverId, senderid });
    return this.messageModel.updateMany(
      {
        receiverId: receiverId,
        senderid: senderid,
        timestamp: { $lt: timestamp },
      },
      {
        $set: { read: true, readAt: new Date() },
      },
      { new: true },
    );
  }

  async getConversation(userA: string, userB: string) {
    console.log({ userA, userB });
    return this.messageModel
      .find({
        $or: [
          { senderId: userA, receiverId: userB },
          { senderId: userB, receiverId: userA },
        ],
      })
      .sort({ timestamp: 1 });
  }
}
