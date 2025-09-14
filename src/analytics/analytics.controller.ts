import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from 'src/features/auth/jwtAuthGuard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('')
  @UseGuards(JwtAuthGuard)
  async get() {
    return this.analyticsService.getAnalytics();
  }
}
