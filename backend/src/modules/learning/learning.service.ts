import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningPlan } from '../../entities/learning-plan.entity';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { MaterialService } from '../material/material.service';

@Injectable()
export class LearningService {
  constructor(
    @InjectRepository(LearningPlan)
    private planRepository: Repository<LearningPlan>,
    @InjectRepository(LearningProgress)
    private progressRepository: Repository<LearningProgress>,
    private materialService: MaterialService,
  ) {}

  async create(userId: string, materialId: string, targetLevel: string = 'basic') {
    const plan = this.planRepository.create({
      userId,
      materialId,
      targetLevel,
      status: 'in_progress',
    });
    const savedPlan = await this.planRepository.save(plan);

    const knowledgePoints = await this.materialService.getKnowledgePoints(materialId);
    
    if (knowledgePoints.length > 0) {
      const firstProgress = this.progressRepository.create({
        planId: savedPlan.id,
        knowledgePointId: knowledgePoints[0].id,
        status: 'in_progress',
      });
      await this.progressRepository.save(firstProgress);

      for (let i = 1; i < knowledgePoints.length; i++) {
        const progress = this.progressRepository.create({
          planId: savedPlan.id,
          knowledgePointId: knowledgePoints[i].id,
          status: 'locked',
        });
        await this.progressRepository.save(progress);
      }
    }

    return savedPlan;
  }

  async findAll(userId: string) {
    return this.planRepository.find({
      where: { userId },
      relations: ['material'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    return this.planRepository.findOne({
      where: { id },
      relations: ['material'],
    });
  }

  async getProgress(planId: string) {
    return this.progressRepository.find({
      where: { planId },
      relations: ['knowledgePoint'],
      order: { id: 'ASC' },
    });
  }

  async completeChapter(planId: string, knowledgePointId: string, score?: number) {
    const progress = await this.progressRepository.findOne({
      where: { planId, knowledgePointId },
    });
    if (!progress) {
      throw new Error('学习进度不存在');
    }

    progress.status = score !== undefined && score >= 60 ? 'quiz_passed' : 'completed';
    if (score !== undefined) {
      progress.quizScore = score;
    }
    progress.completedAt = new Date();
    await this.progressRepository.save(progress);

    if (score !== undefined && score >= 60) {
      await this.unlockNextChapter(planId, knowledgePointId);
    }

    return progress;
  }

  private async unlockNextChapter(planId: string, currentKnowledgePointId: string) {
    const progressList = await this.progressRepository.find({
      where: { planId },
      order: { id: 'ASC' },
    });

    const currentIndex = progressList.findIndex(p => p.knowledgePointId === currentKnowledgePointId);
    if (currentIndex >= 0 && currentIndex < progressList.length - 1) {
      const nextProgress = progressList[currentIndex + 1];
      nextProgress.status = 'in_progress';
      await this.progressRepository.save(nextProgress);
    }
  }

  async update(id: string, data: Partial<LearningPlan>) {
    await this.planRepository.update(id, data);
    return this.findById(id);
  }
}