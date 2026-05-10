import { Controller, Post, Body, Headers, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { PinService } from './pin.service';
import { LoginDto } from './dto/login.dto';
import { ValidatePinDto } from './dto/validate-pin.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly pinService: PinService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login de usuário e geração de tokens' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'ID do Tenant' })
  async login(@Body() loginDto: LoginDto, @Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new UnauthorizedException('x-tenant-id header is missing');
    return this.authService.login(loginDto, tenantId);
  }

  @Post('pin/validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validação de PIN operacional' })
  async validatePin(@Body() validatePinDto: ValidatePinDto, @Request() req: any) {
    return this.pinService.validatePin(req.user.id, validatePinDto.pin);
  }
}
