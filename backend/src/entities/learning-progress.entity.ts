import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { LearningPlan } from './learning-plan.entity';
import { KnowledgePoint } from './knowledge-point.entity';

@Entity('learning_progress')
export class LearningProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  planId: string;

  @ManyToOne(() => LearningPlan)
  plan: LearningPlan;

  @Column()
  knowledgePointId: string;

  @ManyToOne(() => KnowledgePoint)
  knowledgePoint: KnowledgePoint;

  @Column({ default: 'locked' })
  status: string;

  @Column({ nullable: true })
  quizScore: number;

  @Column({ nullable: true })
  completedAt: Date;
}