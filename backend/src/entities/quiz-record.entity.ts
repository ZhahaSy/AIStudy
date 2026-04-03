import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { LearningPlan } from './learning-plan.entity';
import { KnowledgePoint } from './knowledge-point.entity';

@Entity('quiz_records')
export class QuizRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  planId: string;

  @ManyToOne(() => LearningPlan)
  plan: LearningPlan;

  @Column()
  knowledgePointId: string;

  @ManyToOne(() => KnowledgePoint)
  knowledgePoint: KnowledgePoint;

  @Column({ nullable: true })
  score: number;

  @Column({ type: 'json', nullable: true })
  answers: any;

  @CreateDateColumn()
  submittedAt: Date;
}