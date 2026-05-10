import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/User.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PinService {
  // Em produção, isso usaria Redis. Para o MVP inicial, usaremos um mapa em memória
  // com a consciência de que reinicializar o servidor limpa os bloqueios.
  private attempts = new Map<string, { count: number, lockUntil: number }>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async validatePin(userId: string, pin: string) {
    const now = Date.now();
    const userAttempts = this.attempts.get(userId);

    if (userAttempts && userAttempts.lockUntil > now) {
      const remainingMinutes = Math.ceil((userAttempts.lockUntil - now) / 60000);
      throw new BadRequestException(`PIN blocked. Try again in ${remainingMinutes} minutes.`);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'pin'],
    });

    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(pin, user.pin);

    if (isValid) {
      this.attempts.delete(userId);
      return true;
    } else {
      const count = (userAttempts?.count || 0) + 1;
      if (count >= 3) {
        this.attempts.set(userId, { count, lockUntil: now + 15 * 60 * 1000 }); // 15 min lock
        throw new BadRequestException('PIN blocked for 15 minutes due to 3 failed attempts.');
      } else {
        this.attempts.set(userId, { count, lockUntil: 0 });
        throw new UnauthorizedException(`Invalid PIN. ${3 - count} attempts remaining.`);
      }
    }
  }
}
