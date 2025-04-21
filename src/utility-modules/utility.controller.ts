// src/upload/upload.controller.ts
import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwtAuthGuard';
import { UtilityService } from './utility.service';

@Controller('utility') // <- this is your base path
export class UtilityController {
  constructor(private readonly utilityService: UtilityService) {}

  @UseGuards(JwtAuthGuard)
  @Post('file-upload')
  async upload(@Req() req: Request) {
    return this.utilityService.uploadFromRequest(req);
  }
}
