import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, nickname?: string) {
    const user = this.userRepository.create({
      email,
      passwordHash: password,
      nickname: nickname || email.split('@')[0] || '用户',
    });
    const savedUser = await this.userRepository.save(user);
    return this.generateToken(savedUser);
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({
      where: [{ email }, { phone: email }],
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (user.passwordHash !== password) {
      throw new UnauthorizedException('密码错误');
    }

    return this.generateToken(user);
  }

  async validateUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return user;
  }

  private generateToken(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    };
  }
}