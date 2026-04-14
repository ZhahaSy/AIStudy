import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  materialId: string;

  @Column('text')
  content: string;

  @Column('text')
  embedding: string;

  @Column({ default: 0 })
  chunkIndex: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
