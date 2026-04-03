import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { KnowledgePoint } from './knowledge-point.entity';

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  knowledgePointId: string;

  @ManyToOne(() => KnowledgePoint)
  knowledgePoint: KnowledgePoint;

  @Column({ default: 'choice' })
  questionType: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'json', nullable: true })
  options: string[];

  @Column({ type: 'text' })
  correctAnswer: string;

  @Column({ type: 'text', nullable: true })
  explanation: string;
}