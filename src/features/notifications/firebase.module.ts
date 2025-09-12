import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { join } from 'path';
import { FirebaseService } from './firebase.service';
import { NotificationsController } from './notifications.controller';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        return admin.initializeApp({
          credential: admin.credential.cert(
            join(process.cwd(), 'src/config/firebase-fcm.json'),
          ),
        });
      },
    },
    FirebaseService,
  ],
  controllers: [NotificationsController],
  exports: [FirebaseService],
})
export class FirebaseModule {}
