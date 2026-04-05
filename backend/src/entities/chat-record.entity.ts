import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { LearningPlan } from './learning-plan.entity';
import { KnowledgePoint } from './knowledge-point.entity';

@Entity('chat_records')
export class ChatRecord {
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

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @CreateDateColumn()
  createdAt: Date;
}
