import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { LearningPlan } from './learning-plan.entity';
import { KnowledgePoint } from './knowledge-point.entity';
import { Material } from './material.entity';

@Entity('chat_records')
export class ChatRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @Column({ nullable: true })
  planId: string;

  @ManyToOne(() => LearningPlan)
  plan: LearningPlan;

  @Column({ nullable: true })
  knowledgePointId: string;

  @ManyToOne(() => KnowledgePoint)
  knowledgePoint: KnowledgePoint;

  @Column({ nullable: true })
  materialId: string;

  @ManyToOne(() => Material)
  material: Material;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @CreateDateColumn()
  createdAt: Date;
}
