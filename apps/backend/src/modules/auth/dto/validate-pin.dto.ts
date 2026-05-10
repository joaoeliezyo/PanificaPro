import { IsString, Length } from 'class-validator';

export class ValidatePinDto {
  @IsString()
  @Length(4, 6)
  pin: string;
}
