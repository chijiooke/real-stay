import { Global, Module } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';
import { NotificationsController } from './notifications.controller';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: async () => {
        // Fetch the JSON from your CDN
        console.log({ url: process.env.FCM_AUTH_CDN_URL });
        const response = await fetch(process.env.FCM_AUTH_CDN_URL as string);
        if (!response.ok) {
          throw new Error('Failed to fetch Firebase service account JSON');
        }

        const serviceAccount = await response.json();
        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      },
    },
    FirebaseService,
  ],
  controllers: [NotificationsController],
  exports: [FirebaseService],
})
export class FirebaseModule {}
