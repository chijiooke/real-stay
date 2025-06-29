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

  // userA is represents the the device owner
  async getConversation(userA: string, userB: string) {
    console.log();
    return this.messageModel.aggregate([
      {
        $match: {
          $or: [
            { senderId: userA, receiverId: userB },
            { senderId: userB, receiverId: userA },
          ],
        },
      },
      {
        $addFields: {
          recipientId: {
            $cond: [{ $eq: ['$senderId', userA] }, userB, userA],
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { recipientIdStr: '$recipientId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $toObjectId: '$$recipientIdStr' }],
                },
              },
            },
            {
              $project: {
                recipient_first_name: '$first_name',
                recipient_last_name: '$last_name',
                recipient_email: '$email',
                recipient_phone: '$phone_number',
                image_url: '$image_url',
              },
            },
          ],
          as: 'recipientInfo',
        },
      },
      {
        $unwind: {
          path: '$recipientInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          recipientMetadata: '$recipientInfo',
        },
      },
      {
        $project: {
          recipientInfo: 0, // clean up
        },
      },
      {
        $sort: {
          timestamp: 1,
        },
      },
    ]);
  }

  // userA is represents the the device owner
  async getConversations(userA: string) {
    // const userAObjectId = new Types.ObjectId(userA);

    return this.messageModel.aggregate([
      {
        $match: {
          $or: [{ senderId: userA }, { receiverId: userA }],
        },
      },
      {
        $addFields: {
          otherUserId: {
            $cond: [{ $eq: ['$senderId', userA] }, '$receiverId', '$senderId'],
          },
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: '$otherUserId',
          messageId: { $first: '$_id' },
          content: { $first: '$content' },
          fileUrl: { $first: '$fileUrl' },
          fileType: { $first: '$fileType' },
          timestamp: { $first: '$timestamp' },
          read: { $first: '$read' },
          readAt: { $first: '$readAt' },
          senderId: { $first: '$senderId' },
          receiverId: { $first: '$receiverId' },
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { otherIdStr: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $toObjectId: '$$otherIdStr' }],
                },
              },
            },
          ],
          as: 'otherUser',
        },
      },
      {
        $unwind: {
          path: '$otherUser',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          recipientMetadata: {
            recipient_first_name: '$otherUser.first_name',
            recipient_last_name: '$otherUser.last_name',
            recipient_email: '$otherUser.email',
            recipient_phone: '$otherUser.phone_number',
            image_url: '$otherUser.image_url',
          },
        },
      },
      {
        $project: {
          otherUser: 0, // optional: remove raw user object
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
