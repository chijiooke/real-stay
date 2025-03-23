import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as http from 'http';
import { AuthModule } from '../src/auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let server: http.Server;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        MongooseModule.forRoot('mongodb://localhost:27017/nest-auth-test'),
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    server = app.getHttpServer() as http.Server;
  });

  afterAll(async () => {
    await app.close();
  });

  const user = { email: 'test@example.com', password: 'password123' };

  it('should sign up a user', async () => {
    return request(server)
      .post('/auth/signup')
      .send(user)
      .expect(201)
      .expect((res: request.Response) => {
        const responseBody = res.body as { id: string; email: string };
        expect(responseBody).toHaveProperty('id');
        expect(responseBody.email).toBe(user.email);
      });
  });

  it('should log in a user and return a JWT', async () => {
    return request(server)
      .post('/auth/login')
      .send(user)
      .expect(201)
      .expect((res: request.Response) => {
        const responseBody = res.body as { access_token: string };
        expect(responseBody).toHaveProperty('access_token');
        accessToken = responseBody.access_token;
      });
  });

  it('should access a protected route with a valid token', async () => {
    return request(server)
      .get('/auth/profile') // Changed from POST to GET
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200) // Changed from 201 to 200 for a GET request
      .expect((res) => {
        expect(res.body).toHaveProperty('userId');
        expect(res.body).toHaveProperty('email', user.email);
      });
  });

  it('should deny access to a protected route without a token', async () => {
    return request(server)
      .get('/auth/profile') // Changed from POST to GET
      .expect(401);
  });
});
