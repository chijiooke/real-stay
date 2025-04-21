import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from 'src/users/users.service';
import { Conversation } from './conversation.schema';
import { Message, UserMeta } from './message.schema';

@Injectable()
export class ChatService {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
  ) {}

  async saveMessage(
    senderId: string,
    receiverId: string,
    content?: string,
    fileUrl?: string,
    fileType?: string,
  ) {
    console.log({ senderId, receiverId });

    // 1. Get user data for sender and receiver
    const [senderUser, receiverUser] = await Promise.all([
      this.usersService.findById(senderId),
      this.usersService.findById(receiverId),
    ]);

    console.log({ senderUser, receiverUser });
    if (!senderUser || !receiverUser) {
      throw new Error('Sender or Receiver does not exist');
    }

    const sender: UserMeta = {
      first_name: senderUser.first_name,
      last_name: senderUser.last_name,
      image_url: senderUser.image_url,
    };

    const receiver: UserMeta = {
      first_name: receiverUser.first_name,
      last_name: receiverUser.last_name,
      image_url: receiverUser.image_url,
    };

    // 2. Create or find the conversation
    const conversation = await this.conversationModel.findOneAndUpdate(
      { senderId, receiverId },
      {
        sender: {
          first_name: sender.first_name,
          image_url: sender.image_url,
          last_name: sender.last_name,
        },
        receiver: {
          first_name: receiver.first_name,
          image_url: receiver.image_url,
          last_name: receiver.last_name,
        },
      },
      { upsert: true, new: true }, // Returns the existing or newly created conversation
    );

    // 3. Prepare message data
    const messageData = {
      senderId,
      receiverId,
      conversationId: conversation._id,
      content: content || null,
      fileUrl: fileUrl || null,
      fileType: fileType || null,
      read: false,
      timestamp: new Date(),
    };

    // 4. Save message with conversationId
    try {
      const message = await this.messageModel.create(messageData);
      return message;
    } catch (error) {
      console.error('Error saving message:', error);
      throw new Error('Unable to save message');
    }
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

  async getConversations(userA: string) {
    return this.messageModel.aggregate([
      {
        $match: {
          receiverId: userA,
        },
      },
      {
        $sort: {
          timestamp: -1,
        },
      },
      {
        $group: {
          _id: '$senderId',
          messageId: { $first: '$_id' },
          senderId: { $first: '$senderId' },
          receiverId: { $first: '$receiverId' },
          sender: { $first: '$sender' }, // 👈 includes fullname & image
          receiver: { $first: '$receiver' }, // (optional) include if needed
          content: { $first: '$content' },
          fileUrl: { $first: '$fileUrl' },
          fileType: { $first: '$fileType' },
          timestamp: { $first: '$timestamp' },
          read: { $first: '$read' },
          readAt: { $first: '$readAt' },
        },
      },
      {
        $sort: {
          timestamp: -1,
        },
      },
    ]);
  }
}
