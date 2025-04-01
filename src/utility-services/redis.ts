import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || '',
      username: process.env.REDIS_USERNAME || '',
    });

    this.client.on('error', (err) => {
      console.error('Redis Error:', err);
    });
  }

  async set(key: string, value: string, ttl: number) {
    await this.client.set(key, value, 'EX', ttl); // Set with expiration
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string) {
    await this.client.del(key);
  }
}
