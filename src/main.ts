import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './interceptors/response-interceptor';
import { GlobalExceptionFilter } from './filters/http-exception.filter';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    // origin: [
    //   'http://localhost:3000',
    //   'https://real-stay-admin.vercel.app'
    // ],
    // credentials: true,
    // methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    // allowedHeaders: 'Content-Type, Authorization',
  });
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || '8080';
  await app.listen(port);

  console.log(`🚀 App listening on port ${process.env.PORT}`);
}

bootstrap();
