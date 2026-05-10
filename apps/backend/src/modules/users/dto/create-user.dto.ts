import { IsEmail, IsString, MinLength, IsEnum, IsUUID, IsOptional, Length } from 'class-validator';
import { UserRole } from '@panificapro/shared';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @Length(4, 6)
  pin: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  @IsOptional()
  sectorId?: string; // Vinculação opcional no cadastro inicial
}
