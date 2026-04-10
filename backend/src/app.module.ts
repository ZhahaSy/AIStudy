import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { MaterialModule } from './modules/material/material.module';
import { LearningModule } from './modules/learning/learning.module';
import { StudyModule } from './modules/study/study.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data/ai_learning.db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'ai-learning-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuthModule,
    UserModule,
    MaterialModule,
    LearningModule,
    StudyModule,
    AiModule,
  ],
})
export class AppModule {}