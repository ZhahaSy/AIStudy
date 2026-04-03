import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<User>) {
    await this.userRepository.update(id, data);
    return this.findById(id);
  }

  async getStats(userId: string) {
    return {
      totalPlans: 0,
      completedPlans: 0,
      totalLearningTime: 0,
    };
  }
}