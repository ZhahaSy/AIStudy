import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../../entities/material.entity';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
    @InjectRepository(KnowledgePoint)
    private knowledgePointRepository: Repository<KnowledgePoint>,
    private aiService: AiService,
  ) {}

  async create(userId: string, title: string, fileUrl: string, fileType: string) {
    const material = this.materialRepository.create({
      userId,
      title,
      fileUrl,
      fileType,
      status: 'pending',
    });
    return this.materialRepository.save(material);
  }

  async findAll(userId: string) {
    return this.materialRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    return this.materialRepository.findOne({ where: { id } });
  }

  async delete(id: string, userId: string) {
    const material = await this.findById(id);
    if (material && material.userId === userId) {
      await this.materialRepository.delete(id);
      return true;
    }
    return false;
  }

  async analyze(id: string) {
    const material = await this.findById(id);
    if (!material) {
      throw new Error('资料不存在');
    }

    const knowledgePoints = await this.aiService.analyzeMaterial(material.fileUrl, material.title);
    
    for (const kp of knowledgePoints) {
      const knowledgePoint = this.knowledgePointRepository.create({
        materialId: id,
        chapter: kp.chapter,
        chapterIndex: kp.chapterIndex,
        title: kp.title,
        content: kp.content,
        summary: kp.summary,
      });
      await this.knowledgePointRepository.save(knowledgePoint);
    }

    await this.materialRepository.update(id, { status: 'analyzed' });
    return this.findById(id);
  }

  async getKnowledgePoints(materialId: string) {
    return this.knowledgePointRepository.find({
      where: { materialId },
      order: { chapterIndex: 'ASC' },
    });
  }
}