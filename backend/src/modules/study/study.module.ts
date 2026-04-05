import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyService } from './study.service';
import { StudyController } from './study.controller';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { QuizQuestion } from '../../entities/quiz-question.entity';
import { QuizRecord } from '../../entities/quiz-record.entity';
import { ChatRecord } from '../../entities/chat-record.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgePoint, QuizQuestion, QuizRecord, ChatRecord]), AiModule],
  controllers: [StudyController],
  providers: [StudyService],
  exports: [StudyService],
})
export class StudyModule {}