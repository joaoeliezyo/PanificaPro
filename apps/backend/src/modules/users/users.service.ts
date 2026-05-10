import { Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/User.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { TenantContext } from '../tenants/tenant.context';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tenantContext: TenantContext,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email, tenantId },
    });

    if (existingUser) {
      throw new ConflictException('User already exists in this tenant');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const hashedPin = await bcrypt.hash(createUserDto.pin, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      pin: hashedPin,
      tenantId,
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    const tenantId = this.tenantContext.getTenantId();
    return this.userRepository.find({
      where: { tenantId },
      relations: ['sector'],
    });
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, tenantId },
      select: ['id', 'email', 'password', 'pin', 'role', 'tenantId'],
    });
  }
}
