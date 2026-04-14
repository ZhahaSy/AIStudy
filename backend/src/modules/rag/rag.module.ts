import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { RagService } from './rag.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentChunk])],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
