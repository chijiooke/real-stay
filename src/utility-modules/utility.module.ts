// src/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { UtilityController } from './utility.controller';
import { UtilityService } from './utility.service';

@Module({
  controllers: [UtilityController],
  providers: [UtilityService],
  exports: [UtilityService],
})
export class UploadModule {}
