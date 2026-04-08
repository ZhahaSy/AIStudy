import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { StudyService } from './study.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('study')
export class StudyController {
  constructor(private studyService: StudyService) {}

  @UseGuards(JwtAuthGuard)
  @Get('chapter/:id/content')
  async getChapterContent(@Param('id') id: string) {
    return this.studyService.getChapterContent(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async askQuestion(
    @Request() req,
    @Body() body: { planId: string; knowledgePointId: string; question: string },
  ) {
    return this.studyService.askQuestion(req.user.id, body.planId, body.knowledgePointId, body.question);
  }

  @UseGuards(JwtAuthGuard)
  @Get('chat/:planId/:knowledgePointId')
  async getChatHistory(
    @Param('planId') planId: string,
    @Param('knowledgePointId') knowledgePointId: string,
  ) {
    return this.studyService.getChatHistory(planId, knowledgePointId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('quiz/generate')
  async generateQuiz(@Body() body: { knowledgePointId: string }) {
    return this.studyService.generateQuiz(body.knowledgePointId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('quiz/submit')
  async submitQuiz(
    @Request() req,
    @Body('planId') planId: string,
    @Body('knowledgePointId') knowledgePointId: string,
    @Body('answers') answers: Record<string, string>,
  ) {
    return this.studyService.submitQuiz(req.user.id, planId, knowledgePointId, answers);
  }

  @UseGuards(JwtAuthGuard)
  @Get('quiz/:id/result')
  async getQuizResult(@Param('id') id: string) {
    return this.studyService.getQuizResult(id);
  }
}