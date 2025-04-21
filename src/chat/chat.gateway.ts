import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { ChatService } from './chat.service';
import { ReadMessageDto } from './dto/read-message.dto';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
  ) {}

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
    console.log(`🔴 Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const sender = client.data.user;
    if (!sender) {
      console.warn('⚠️ Sender info missing in socket. Ignoring message.');
      return;
    }

    console.log({ data });
    try {
      const message = await this.chatService.saveMessage(
        sender.id,
        data.receiverId,
        data.content || '',
        data.fileUrl,
        data.fileType,
      );

      client.broadcast.emit('receive_message', message);
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
