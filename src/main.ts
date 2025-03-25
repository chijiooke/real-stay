import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { AppModule } from './app.module';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Create an Express app
const server = express();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(); // Enable CORS if needed
  await app.listen(3000); // Run on port 3000
  
}

// Call bootstrap to initialize the app
bootstrap();

// Export the Firebase function
export const api = functions.https.onRequest(server);

