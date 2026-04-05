import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialService } from './material.service';
import { MaterialController } from './material.controller';
import { Material } from '../../entities/material.entity';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { LearningPlan } from '../../entities/learning-plan.entity';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { QuizQuestion } from '../../entities/quiz-question.entity';
import { QuizRecord } from '../../entities/quiz-record.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Material, KnowledgePoint, LearningPlan, LearningProgress, QuizQuestion, QuizRecord]), AiModule],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService],
})
export class MaterialModule {}