import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { LearningPlan } from '../../entities/learning-plan.entity';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { MaterialModule } from '../material/material.module';

@Module({
  imports: [TypeOrmModule.forFeature([LearningPlan, LearningProgress]), MaterialModule],
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {}