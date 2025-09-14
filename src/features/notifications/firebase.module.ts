import { Global, Module } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ENV } from 'src/constants/env';
import { FirebaseService } from './firebase.service';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: async () => {
        // Fetch the JSON from your CDN
        console.log({ url: ENV.FCM_AUTH_CDN_URL });
        const response = await fetch(ENV.FCM_AUTH_CDN_URL);
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
  controllers: [],
  exports: [FirebaseService],
})
export class FirebaseModule {}
