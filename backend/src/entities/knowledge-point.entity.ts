import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Material } from './material.entity';

@Entity('knowledge_points')
export class KnowledgePoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  materialId: string;

  @ManyToOne(() => Material)
  material: Material;

  @Column({ nullable: true })
  chapter: string;

  @Column({ default: 0 })
  chapterIndex: number;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'text', nullable: true })
  summary: string;
}