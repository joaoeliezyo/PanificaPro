import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um novo usuário com PIN' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista todos os usuários do tenant' })
  findAll() {
    return this.usersService.findAll();
  }
}
