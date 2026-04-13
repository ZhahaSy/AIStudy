import { Controller, Post, Body, Get, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsString()
  inviteCode: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    if (dto.inviteCode !== 'i am great') {
      throw new BadRequestException('邀请码无效');
    }
    try {
      return await this.authService.register(dto.email, dto.password, dto.nickname);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return req.user;
  }
}