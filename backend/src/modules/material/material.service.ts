import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlinkSync } from 'fs';
import { join } from 'path';
import { Material } from '../../entities/material.entity';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { LearningPlan } from '../../entities/learning-plan.entity';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { QuizQuestion } from '../../entities/quiz-question.entity';
import { QuizRecord } from '../../entities/quiz-record.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
    @InjectRepository(KnowledgePoint)
    private knowledgePointRepository: Repository<KnowledgePoint>,
    @InjectRepository(LearningPlan)
    private learningPlanRepository: Repository<LearningPlan>,
    @InjectRepository(LearningProgress)
    private learningProgressRepository: Repository<LearningProgress>,
    @InjectRepository(QuizQuestion)
    private quizQuestionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizRecord)
    private quizRecordRepository: Repository<QuizRecord>,
    private aiService: AiService,
  ) {}

  async create(userId: string, title: string, fileUrl: string, fileType: string, analyzeMode: 'quick' | 'deep' = 'quick') {
    const material = this.materialRepository.create({
      userId,
      title,
      fileUrl,
      fileType,
      analyzeMode,
      status: 'pending',
    });
    return this.materialRepository.save(material);
  }

  async findAll(userId: string) {
    return this.materialRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: ['id', 'userId', 'title', 'fileUrl', 'fileType', 'analyzeMode', 'status', 'createdAt', 'updatedAt'],
    });
  }

  async findById(id: string) {
    return this.materialRepository.findOne({ where: { id } });
  }

  async delete(id: string, userId: string) {
    const material = await this.findById(id);
    if (!material || material.userId !== userId) return false;

    // 查出关联的知识点和学习计划 id
    const knowledgePoints = await this.knowledgePointRepository.find({ where: { materialId: id } });
    const kpIds = knowledgePoints.map(kp => kp.id);

    const plans = await this.learningPlanRepository.find({ where: { materialId: id } });
    const planIds = plans.map(p => p.id);

    // 按依赖顺序删除
    if (kpIds.length > 0) {
      await this.quizRecordRepository.createQueryBuilder()
        .delete().where('knowledgePointId IN (:...ids)', { ids: kpIds }).execute();
      await this.learningProgressRepository.createQueryBuilder()
        .delete().where('knowledgePointId IN (:...ids)', { ids: kpIds }).execute();
      await this.quizQuestionRepository.createQueryBuilder()
        .delete().where('knowledgePointId IN (:...ids)', { ids: kpIds }).execute();
    }
    if (planIds.length > 0) {
      await this.quizRecordRepository.createQueryBuilder()
        .delete().where('planId IN (:...ids)', { ids: planIds }).execute();
      await this.learningProgressRepository.createQueryBuilder()
        .delete().where('planId IN (:...ids)', { ids: planIds }).execute();
      await this.learningPlanRepository.delete(planIds);
    }
    if (kpIds.length > 0) {
      await this.knowledgePointRepository.delete(kpIds);
    }

    await this.materialRepository.delete(id);
    this.removePhysicalFile(material.fileUrl);
    return true;
  }

  private removePhysicalFile(fileUrl: string) {
    try {
      unlinkSync(join(process.cwd(), fileUrl));
    } catch {}
  }

  async analyze(id: string) {
    const material = await this.findById(id);
    if (!material) {
      throw new Error('资料不存在');
    }

    await this.materialRepository.update(id, { status: 'analyzing' });

    try {
      // 先提取原文并持久化
      const rawContent = await this.aiService.extractFileContent(material.fileUrl);
      if (rawContent) {
        await this.materialRepository.update(id, { rawContent });
      }

      const knowledgePoints = await this.aiService.analyzeMaterial(
        material.fileUrl,
        material.title,
        (material.analyzeMode as 'quick' | 'deep') || 'quick',
        rawContent || undefined,
      );

      for (const kp of knowledgePoints) {
        const knowledgePoint = this.knowledgePointRepository.create({
          materialId: id,
          chapter: kp.chapter,
          chapterIndex: kp.chapterIndex,
          title: kp.title,
          content: kp.content,
          summary: kp.summary,
          sourceContent: kp.sourceContent,
        });
        await this.knowledgePointRepository.save(knowledgePoint);
      }

      await this.materialRepository.update(id, { status: 'analyzed' });
      this.removePhysicalFile(material.fileUrl);
    } catch (err) {
      await this.materialRepository.update(id, { status: 'failed' });
      throw err;
    }

    return this.findById(id);
  }

  async getKnowledgePoints(materialId: string) {
    return this.knowledgePointRepository.find({
      where: { materialId },
      order: { chapterIndex: 'ASC' },
    });
  }
}