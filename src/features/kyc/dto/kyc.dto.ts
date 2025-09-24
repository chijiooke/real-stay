import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyKycDto {
  @IsNotEmpty()
  @IsString()
  id_number: string;

  @IsNotEmpty()
  @IsString()
  id_type: string;
}
