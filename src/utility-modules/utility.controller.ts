// src/upload/upload.controller.ts
import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
<<<<<<< HEAD
// import { JwtAuthGuard } from 'src/auth/jwtAuthGuard';
import { UtilityService } from './utility.service';
import { JwtAuthGuard } from 'src/features/auth/jwtAuthGuard';
=======
import { JwtAuthGuard } from 'src/auth/jwtAuthGuard';
import { UtilityService } from './utility.service';
>>>>>>> 8a6127a674572de7be3b815b7da3d17905789513

@Controller('utility') // <- this is your base path
export class UtilityController {
  constructor(private readonly utilityService: UtilityService) {}

  @UseGuards(JwtAuthGuard)
  @Post('file-upload')
  async upload(@Req() req: Request) {
    return this.utilityService.uploadFromRequest(req);
  }

  @Post('test-email')
  async testemail() {
    return this.utilityService.testEmail();
  }
}
