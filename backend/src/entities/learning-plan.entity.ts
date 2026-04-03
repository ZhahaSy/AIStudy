import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Material } from './material.entity';

@Entity('learning_plans')
export class LearningPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  materialId: string;

  @ManyToOne(() => Material)
  material: Material;

  @Column({ default: 'in_progress' })
  status: string;

  @Column({ default: 'basic' })
  targetLevel: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}