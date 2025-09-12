import { Test, TestingModule } from '@nestjs/testing';
import { KYCController } from './kyc.controller';

describe('KYCController', () => {
  let controller: KYCController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KYCController],
    }).compile();

    controller = module.get<KYCController>(KYCController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
