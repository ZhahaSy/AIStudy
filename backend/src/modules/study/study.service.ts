import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../../entities/material.entity';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { QuizQuestion } from '../../entities/quiz-question.entity';
import { QuizRecord } from '../../entities/quiz-record.entity';
import { ChatRecord } from '../../entities/chat-record.entity';
import { AiService } from '../ai/ai.service';
import { RagService } from '../rag/rag.service';

@Injectable()
export class StudyService {
  constructor(
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
    @InjectRepository(KnowledgePoint)
    private knowledgePointRepository: Repository<KnowledgePoint>,
    @InjectRepository(QuizQuestion)
    private quizQuestionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizRecord)
    private quizRecordRepository: Repository<QuizRecord>,
    @InjectRepository(ChatRecord)
    private chatRecordRepository: Repository<ChatRecord>,
    private aiService: AiService,
    private ragService: RagService,
  ) {}

  async getChapterContent(knowledgePointId: string) {
    const knowledgePoint = await this.knowledgePointRepository.findOne({
      where: { id: knowledgePointId },
    });
    if (!knowledgePoint) {
      throw new Error('知识点不存在');
    }

    if (!knowledgePoint.explanation) {
      knowledgePoint.explanation = await this.aiService.explainKnowledgePoint(
        knowledgePointId,
        knowledgePoint.content,
        knowledgePoint.sourceContent,
      );
      await this.knowledgePointRepository.save(knowledgePoint);
    }

    return knowledgePoint;
  }

  async askQuestion(userId: string, planId: string, knowledgePointId: string, question: string) {
    const knowledgePoint = await this.knowledgePointRepository.findOne({
      where: { id: knowledgePointId },
    });

    const context = knowledgePoint?.sourceContent || knowledgePoint?.content || '';

    let rawContent: string | undefined;
    if (knowledgePoint?.materialId) {
      const material = await this.materialRepository.findOne({
        where: { id: knowledgePoint.materialId },
        select: ['id', 'rawContent'],
      });
      if (material?.rawContent) {
        try {
          const chunks = await this.ragService.retrieveChunks(material.id, question, 5);
          rawContent = chunks.join('\n\n');
        } catch {
          rawContent = material.rawContent.length <= 4000
            ? material.rawContent
            : this.aiService.findRelevantChunks(material.rawContent, question);
        }
      }
    }

    const answer = await this.aiService.answerQuestion(question, context, rawContent);

    const record = this.chatRecordRepository.create({
      userId,
      planId,
      knowledgePointId,
      question,
      answer,
    });
    await this.chatRecordRepository.save(record);

    return { question, answer };
  }

  async getChatHistory(planId: string, knowledgePointId: string) {
    return this.chatRecordRepository.find({
      where: { planId, knowledgePointId },
      order: { createdAt: 'ASC' },
      select: ['id', 'question', 'answer', 'createdAt'],
    });
  }

  async generateQuiz(knowledgePointId: string) {
    const knowledgePoint = await this.knowledgePointRepository.findOne({
      where: { id: knowledgePointId },
    });
    if (!knowledgePoint) {
      throw new Error('知识点不存在');
    }

    // 删除旧题，避免历史题目混入
    await this.quizQuestionRepository.delete({ knowledgePointId });

    const questions = await this.aiService.generateQuiz(
      knowledgePointId,
      knowledgePoint.content,
    );

    const savedQuestions = [];
    for (const q of questions) {
      const quizQuestion = this.quizQuestionRepository.create({
        knowledgePointId,
        questionType: q.questionType,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      });
      const saved = await this.quizQuestionRepository.save(quizQuestion);
      savedQuestions.push(saved);
    }

    return savedQuestions;
  }

  async submitQuiz(
    userId: string,
    planId: string,
    knowledgePointId: string,
    answers: Record<string, string>,
  ) {
    const questions = await this.quizQuestionRepository.find({
      where: { knowledgePointId },
    });

    let correctCount = 0;
    const results = [];

    for (const question of questions) {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;

      if (isCorrect) correctCount++;

      results.push({
        questionId: question.id,
        question: question.question,
        options: question.options,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
      });
    }

    const score = Math.round((correctCount / questions.length) * 100);

    const record = this.quizRecordRepository.create({
      userId,
      planId,
      knowledgePointId,
      score,
      answers,
    });
    await this.quizRecordRepository.save(record);

    return {
      score,
      totalQuestions: questions.length,
      correctCount,
      results,
    };
  }

  async getQuizResult(recordId: string) {
    return this.quizRecordRepository.findOne({ where: { id: recordId } });
  }

  async askMaterialQuestion(userId: string, materialId: string, question: string) {
    const material = await this.materialRepository.findOne({
      where: { id: materialId },
      select: ['id', 'rawContent'],
    });
    if (!material) {
      throw new Error('资料不存在');
    }

    const knowledgePoints = await this.knowledgePointRepository.find({
      where: { materialId },
    });

    const context = knowledgePoints
      .map((kp) => `【${kp.chapter} - ${kp.title}】\n${kp.content}`)
      .join('\n\n');

    let rawContent: string | undefined;
    if (material.rawContent) {
      try {
        const chunks = await this.ragService.retrieveChunks(materialId, question, 5);
        rawContent = chunks.join('\n\n');
      } catch {
        rawContent = material.rawContent.length <= 4000
          ? material.rawContent
          : this.aiService.findRelevantChunks(material.rawContent, question);
      }
    }

    const answer = await this.aiService.answerQuestion(question, context, rawContent);

    const record = this.chatRecordRepository.create({
      userId,
      materialId,
      question,
      answer,
    });
    await this.chatRecordRepository.save(record);

    return { question, answer };
  }

  async getMaterialChatHistory(materialId: string, userId: string) {
    return this.chatRecordRepository.find({
      where: { materialId, userId },
      order: { createdAt: 'ASC' },
      select: ['id', 'question', 'answer', 'createdAt'],
    });
  }
}