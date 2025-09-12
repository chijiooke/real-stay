import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { ReadMessageDto } from './dto/read-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
  ) {}

  private connectedUsers: Map<string, string> = new Map();

  async handleConnection(client: Socket) {
    const token = client.handshake.query.token as string;
    console.log(`🟡 Client attempting connection: ${client.id}`);

    if (!token) {
      console.warn('❌ No token provided. Disconnecting client.');
      return client.disconnect();
    }

    try {
      const user = await this.authService.verifyToken(token);
      client.data.user = user;

      // Save the userId to socketId mapping
      this.connectedUsers.set(user.id, client.id);
      console.log(`✅ Client connected: ${client.id}, userId: ${user.id}`);
    } catch (err) {
      console.error(
        `❌ Token verification failed for ${client.id}:`,
        err.message,
      );
      // return { status: 'failed', message: err.message };
      return client.disconnect();
    }

    client.on('error', (err) => {
      console.error(`🔥 Socket error [${client.id}]:`, err.message);
    });
  }

  handleDisconnect(client: Socket): void {
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        console.log(`🔌 Client disconnected: ${client.id}, userId: ${userId}`);
        break;
      }
    }
    console.log(`🔴 Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('sending event+++++');
    const sender = client.data.user;
    if (!sender) {
      console.warn('⚠️ Sender info missing in socket. Ignoring message.');
      return;
    }

    // console.log({ data: JSON.parse(data) });
    data = JSON.parse(data) as SendMessageDto;
    try {
      const message = await this.chatService.saveMessage(
        sender.id,
        data.receiverId,
        data.content || '',
        data.fileUrl,
        data.fileType,
      );

      const receiverSocketId = this.connectedUsers.get(data.receiverId);
      if (receiverSocketId) {
        client.to(receiverSocketId).emit('receive_message', message);
      } else {
        console.log('❗️Receiver not online:', message.receiverId);
      }

      return { status: 'sent', message };
    } catch (err) {
      console.error('❌ Error sending message:', err.message);
      return { status: 'error', error: err.message };
    }
  }

  @SubscribeMessage('message_read')
  async handleReadReceipt(
    @MessageBody() data: ReadMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    console.log({ data: data.senderId });
    try {
      if (!data.senderId || data?.senderId?.trim() === '') {
        throw new Error('Sender id required');
      }

      const updated = await this.chatService.markMessageAsRead(
        client.data.user.id,
        data.senderId,
        new Date(),
      );

      client.broadcast.emit('message_read_ack', updated);
      return { status: 'read' };
    } catch (err) {
      console.error('❌ Error handling read receipt:', err.message);
      return { status: 'error', error: err.message };
    }
  }
}
