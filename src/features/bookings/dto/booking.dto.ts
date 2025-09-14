import { IsMongoId, IsString } from 'class-validator';

export class CompleteBookingDto {
  @IsString()
  transactionRef: string;

  @IsMongoId()
  bookingId: string;
}
