import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  title: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  fileType: string;

  @Column({ default: 'quick' })
  analyzeMode: string;

  @Column({ type: 'text', nullable: true })
  rawContent: string;

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}