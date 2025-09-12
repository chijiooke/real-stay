import { Test, TestingModule } from '@nestjs/testing';
import { bookingsController } from './bookings.controller';

describe('RatingsController', () => {
  let controller: bookingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [bookingsController],
    }).compile();

    controller = module.get<bookingsController>(bookingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
