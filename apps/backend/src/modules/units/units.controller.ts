import { ApiTags, ApiHeader, ApiOperation } from '@nestjs/swagger';

@ApiTags('units')
@ApiHeader({ name: 'x-tenant-id', description: 'ID do Tenant' })
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma nova unidade e setores padrão' })
  create(@Body() createUnitDto: CreateUnitDto) {
    return this.unitsService.create(createUnitDto);
  }

  @Get()
  findAll() {
    return this.unitsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.unitsService.findOne(id);
  }
}
