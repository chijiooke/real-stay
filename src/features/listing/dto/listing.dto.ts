import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsMongoId,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  place_holder_address: string;

  @IsString()
  @IsNotEmpty()
  google_formatted_address: string;

  @IsMongoId()
  @IsNotEmpty()
  owner_id: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  lga: string;

  @IsNumber()
  @Type(() => Number)
  lat: number;

  @IsNumber()
  @Type(() => Number)
  lng: number;

  @IsNotEmpty()
  location: {
    type: string;
    coordinates: number[];
  };

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  no_of_beds?: number;

  @IsOptional()
  @IsBoolean()
  are_pets_allowed?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  no_of_bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  no_of_bathrooms?: number;

  @IsOptional()
  @IsBoolean()
  are_parties_allowed?: boolean;

  @IsOptional()
  @IsArray()
  extra_offerings?: string[];

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cost?: number;

  @IsOptional()
  @IsString()
  cost_cycle?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsNotEmpty()
  photos: string[];

  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}
