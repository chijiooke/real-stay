// import { NestFactory } from '@nestjs/core';
// import * as express from 'express';
// import * as admin from 'firebase-admin';
// import * as functions from 'firebase-functions';
// import { AppModule } from './app.module';

// // Initialize Firebase Admin SDK
// admin.initializeApp();

// // Create an Express app
// const server = express();

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   app.enableCors(); // Enable CORS if needed
//   const port = process.env.PORT || '8080';
//   await app.listen(port);
//   console.log(`app listening on ${port}`);
// }

// // Call bootstrap to initialize the app
// bootstrap();

// // Export the Firebase function
// export const api = functions.https.onRequest(server);


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Enable CORS if needed
  const port = process.env.PORT || '8080';
  await app.listen(port);
  console.log(`app listening on ${port}`);
}

bootstrap();