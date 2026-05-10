import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Popula o banco com dados de teste (Tenant, Unit, Sectors, Admin User)' })
  run() {
    return this.seedService.run();
  }
}
