import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialService } from './material.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('materials')
export class MaterialController {
  constructor(private materialService: MaterialService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async upload(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title: string; analyzeMode?: 'quick' | 'deep' }
  ) {
    const fileUrl = `/uploads/${file.filename}`;
    const fileType = extname(file.originalname).slice(1);
    return this.materialService.create(req.user.id, body.title, fileUrl, fileType, body.analyzeMode || 'quick');
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() body: { title: string; fileUrl: string; fileType: string }) {
    return this.materialService.create(req.user.id, body.title, body.fileUrl, body.fileType);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req) {
    return this.materialService.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.materialService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.materialService.delete(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/analyze')
  async analyze(@Param('id') id: string) {
    // 立即返回，后台异步执行分析
    this.materialService.analyze(id).catch(err =>
      console.error(`[analyze] material ${id} failed:`, err)
    );
    return { message: 'analyzing', id };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/knowledge-points')
  async getKnowledgePoints(@Param('id') id: string) {
    return this.materialService.getKnowledgePoints(id);
  }
}