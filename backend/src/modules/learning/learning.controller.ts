import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { LearningService } from './learning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('learning')
export class LearningController {
  constructor(private learningService: LearningService) {}

  @UseGuards(JwtAuthGuard)
  @Post('plans')
  async create(@Request() req, @Body() body: { materialId: string; targetLevel?: string }) {
    return this.learningService.create(req.user.id, body.materialId, body.targetLevel);
  }

  @UseGuards(JwtAuthGuard)
  @Get('plans')
  async findAll(@Request() req) {
    return this.learningService.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('plans/:id')
  async findOne(@Param('id') id: string) {
    return this.learningService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('plans/:id/progress')
  async getProgress(@Param('id') id: string) {
    return this.learningService.getProgress(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('chapters/:knowledgePointId/complete')
  async completeChapter(
    @Param('knowledgePointId') knowledgePointId: string,
    @Request() req,
    @Body() body: { planId: string; score?: number },
  ) {
    return this.learningService.completeChapter(body.planId, knowledgePointId, body.score);
  }

  @UseGuards(JwtAuthGuard)
  @Put('plans/:id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.learningService.update(id, data);
  }
}