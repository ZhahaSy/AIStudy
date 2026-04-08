import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse');

interface KnowledgePointData {
  chapter: string;
  chapterIndex: number;
  title: string;
  content: string;
  summary: string;
  sourceContent?: string;
}

interface QuizQuestionData {
  questionType: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

@Injectable()
export class AiService {
  private claudeBaseUrl = process.env.ANTHROPIC_BASE_URL || 'http://api-ai-coding.bilibili.co/v1';
  private claudeApiKey = process.env.ANTHROPIC_AUTH_TOKEN || 'sk-aicoding-qA3uksT7ngB7cwcqq2tp7yQkp5kAWLSf';
  
  private miniMaxApiKey = process.env.MINIMAX_API_KEY || 'sk-api-D9X-rWFv0kN6P48ks6YBaSAnOPHI_F-4GVFFjlTJVvqYgF-jFoFWo6CieW8eX49tuP1Kt9xAWgQtl8QXTxjaymeyFe694U6GYcHgF5FoX9h354CyM1bCfRw';
  private miniMaxBaseUrl = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

  private defaultModel = 'miniMax';

  // 按段落语义分块，每块不超过 chunkSize 字符
  private chunkText(text: string, chunkSize = 1800): string[] {
    const paragraphs = text.split(/\n{2,}|\r\n{2,}/);
    const chunks: string[] = [];
    let current = '';

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      if (current.length + trimmed.length + 2 > chunkSize) {
        if (current) chunks.push(current.trim());
        // 单段超长则强制截断
        if (trimmed.length > chunkSize) {
          for (let i = 0; i < trimmed.length; i += chunkSize) {
            chunks.push(trimmed.slice(i, i + chunkSize));
          }
          current = '';
        } else {
          current = trimmed;
        }
      } else {
        current += (current ? '\n\n' : '') + trimmed;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  // 第一阶段：对每个分块提取学习目标和关键概念，合并成浓缩摘要
  private async buildCondensedSummary(chunks: string[]): Promise<string> {
    const chunkSummaries: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const prompt = `请从以下文本中提取学习目标和关键概念，用简洁的要点列出（不超过150字）：\n\n${chunks[i]}`;
      try {
        const result = this.defaultModel === 'claude'
          ? await this.claudeChat(prompt)
          : await this.miniMaxChat(prompt);
        chunkSummaries.push(`【片段${i + 1}】\n${result}`);
      } catch {
        // 单块失败不影响整体
      }
    }

    return chunkSummaries.join('\n\n');
  }

  async extractFileContent(fileUrl: string): Promise<string> {
    try {
      // fileUrl 格式为 /uploads/xxx.pdf，转为本地路径
      const filePath = join(process.cwd(), fileUrl);
      const ext = fileUrl.split('.').pop()?.toLowerCase();

      if (ext === 'pdf') {
        const buffer = readFileSync(filePath);
        const data = await pdfParse(buffer);
        return data.text;
      } else if (['txt', 'md'].includes(ext || '')) {
        return readFileSync(filePath, 'utf-8');
      }
      return '';
    } catch (error) {
      console.error('文件内容提取失败:', error);
      return '';
    }
  }

  async analyzeMaterial(fileUrl: string, title: string, mode: 'quick' | 'deep' = 'quick', preExtractedContent?: string): Promise<KnowledgePointData[]> {
    const fileContent = preExtractedContent ?? await this.extractFileContent(fileUrl);

    let condensed: string;
    if (!fileContent) {
      condensed = '';
    } else if (mode === 'quick') {
      // 快速模式：直接截取前段，不做分块摘要
      condensed = fileContent.slice(0, 3600);
    } else {
      // 细致模式：两阶段分块摘要
      const chunks = this.chunkText(fileContent);
      if (chunks.length <= 1) {
        condensed = fileContent.slice(0, 3600);
      } else {
        condensed = await this.buildCondensedSummary(chunks);
      }
    }

    const prompt = mode === 'quick'
      ? `请基于以下学习资料，提取资料中的全部知识点（不要遗漏），每个知识点内容简洁，适合"知道就好"的快速了解。
资料标题：${title}
${condensed ? `\n资料内容：\n${condensed}\n` : ''}
请按照以下JSON格式返回知识点列表（sourceContent 为该知识点对应的原文片段，直接从资料中摘取）：
[
  {
    "chapter": "章节名称",
    "chapterIndex": 章节序号,
    "title": "知识点标题",
    "content": "简洁的知识点说明（100字以内）",
    "summary": "一句话总结",
    "sourceContent": "该知识点对应的原文片段"
  }
]`
      : `请基于以下学习资料的浓缩摘要，提取资料中的全部知识点（不要遗漏），每个知识点需详细展开，包含原理、示例和要点，适合系统性深入学习。
资料标题：${title}
${condensed ? `\n浓缩摘要：\n${condensed}\n` : ''}
请按照以下JSON格式返回知识点列表（sourceContent 为该知识点对应的原文片段，直接从资料中摘取）：
[
  {
    "chapter": "章节名称",
    "chapterIndex": 章节序号,
    "title": "知识点标题",
    "content": "详细的知识点内容，包含原理、示例和要点（300字以内）",
    "summary": "精简总结（适合复习回顾）",
    "sourceContent": "该知识点对应的原文片段"
  }
]`;

    try {
      if (this.defaultModel === 'claude') {
        return await this.analyzeWithClaude(prompt, title);
      } else {
        return await this.analyzeWithMiniMax(prompt, title);
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      return this.getDefaultKnowledgePoints(title);
    }
  }

  private async analyzeWithClaude(prompt: string, title: string): Promise<KnowledgePointData[]> {
    try {
      const response = await fetch(`${this.claudeBaseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 4000,
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude API HTTP错误:', response.status, errText.slice(0, 200));
        return this.getDefaultKnowledgePoints(title);
      }
      const data = await response.json();
      const content = data.content?.[0]?.text || '[]';
      return this.parseJsonResult(content);
    } catch (error) {
      console.error('Claude API调用失败:', error);
      return this.getDefaultKnowledgePoints(title);
    }
  }

  private async analyzeWithMiniMax(prompt: string, title: string): Promise<KnowledgePointData[]> {
    try {
      const response = await fetch(this.miniMaxBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.miniMaxApiKey}`,
        },
        body: JSON.stringify({
          model: 'MiniMax-Text-01',
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '[]';
      return this.parseJsonResult(content);
    } catch (error) {
      console.error('MiniMax API调用失败:', error);
      return this.getDefaultKnowledgePoints(title);
    }
  }

  private parseJsonResult(content: string): KnowledgePointData[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch {
      return [];
    }
  }

  private getDefaultKnowledgePoints(title: string): KnowledgePointData[] {
    return [
      {
        chapter: '第一章 概述',
        chapterIndex: 1,
        title: '基础概念',
        content: `${title}的基础概念介绍...`,
        summary: '了解基本概念和核心定义',
      },
      {
        chapter: '第二章 核心内容',
        chapterIndex: 2,
        title: '主要知识点',
        content: `${title}的主要知识点解析...`,
        summary: '掌握核心内容和关键原理',
      },
      {
        chapter: '第三章 实践应用',
        chapterIndex: 3,
        title: '实际应用',
        content: `${title}的实际应用场景...`,
        summary: '了解实际应用场景和方法',
      },
    ];
  }

  async explainKnowledgePoint(knowledgePointId: string, content: string, sourceContent?: string): Promise<string> {
    const prompt = sourceContent
      ? `你是一位专业的学习辅导老师。请基于以下原始资料内容，对知识点进行详细讲解。

## 原始资料内容
${sourceContent}

## 知识点概要
${content}

请按以下结构输出讲解内容：
### 核心概念
（用通俗语言解释核心概念）
### 详细说明
（结合原文展开说明，包含关键细节）
### 要点总结
（列出 2-3 个关键要点）`
      : `请用通俗易懂的方式解释以下知识点，确保简洁明了，适合快速学习：

知识点内容：${content}

请给出简洁的讲解（不超过200字），侧重于"知道就好"的程度。`;

    try {
      if (this.defaultModel === 'claude') {
        return await this.claudeChat(prompt);
      } else {
        return await this.miniMaxChat(prompt);
      }
    } catch (error) {
      console.error('AI讲解失败:', error);
      return content;
    }
  }

  async answerQuestion(question: string, context: string, rawContent?: string): Promise<string> {
    const prompt = rawContent
      ? `你是一位专业的学习辅导老师。请优先基于原始资料内容回答用户的问题，如果原始资料中没有相关信息，再结合知识点内容回答。

## 原始资料内容
${rawContent}

## 知识点内容
${context}

## 用户问题
${question}

请给出准确、详细的回答，引用原文中的关键信息。`
      : `基于以下学习内容，请回答用户的问题：

学习内容：${context}

用户问题：${question}

请给出准确、简洁的回答。`;

    try {
      if (this.defaultModel === 'claude') {
        return await this.claudeChat(prompt);
      } else {
        return await this.miniMaxChat(prompt);
      }
    } catch (error) {
      console.error('AI回答失败:', error);
      return '抱歉，服务暂时不可用。';
    }
  }

  private async claudeChat(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.claudeBaseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 2000,
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude Chat HTTP错误:', response.status, errText.slice(0, 200));
        throw new Error(`Claude API error: ${response.status}`);
      }
      const data = await response.json();
      return data.content?.[0]?.text || '抱歉，我无法回答这个问题。';
    } catch (error) {
      console.error('Claude Chat error:', error);
      throw error;
    }
  }

  private async miniMaxChat(prompt: string): Promise<string> {
    try {
      const response = await fetch(this.miniMaxBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.miniMaxApiKey}`,
        },
        body: JSON.stringify({
          model: 'MiniMax-Text-01',
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
    } catch (error) {
      console.error('MiniMax Chat error:', error);
      throw error;
    }
  }

  findRelevantChunks(rawContent: string, question: string, maxLength = 4000): string {
    // 按 800 字分块
    const chunks: string[] = [];
    for (let i = 0; i < rawContent.length; i += 800) {
      chunks.push(rawContent.slice(i, i + 800));
    }

    // 中文停用词
    const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '被', '从', '把', '让', '用', '对', '为', '什么', '怎么', '如何', '哪', '吗', '呢', '吧', '啊', '呀', '嗯', '哦', '哈', '请问', '请', '问']);

    // 提取关键词（>= 2 字，去停用词）
    const keywords = question
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !stopWords.has(w));

    if (keywords.length === 0) {
      return rawContent.slice(0, maxLength);
    }

    // 对每个 chunk 评分
    const scored = chunks.map((chunk, index) => {
      let score = 0;
      for (const kw of keywords) {
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = chunk.match(regex);
        if (matches) score += matches.length;
      }
      return { chunk, score, index };
    });

    // 按得分降序
    scored.sort((a, b) => b.score - a.score);

    // 取 chunk 直到总长度达到 maxLength
    const selected: typeof scored = [];
    let totalLen = 0;
    for (const item of scored) {
      if (item.score === 0 && selected.length > 0) break;
      if (totalLen + item.chunk.length > maxLength) break;
      selected.push(item);
      totalLen += item.chunk.length;
    }

    // 无命中时兜底取前 maxLength 字
    if (selected.length === 0) {
      return rawContent.slice(0, maxLength);
    }

    // 按原始顺序拼接
    selected.sort((a, b) => a.index - b.index);
    return selected.map(s => s.chunk).join('');
  }

  async generateQuiz(knowledgePointId: string, content: string): Promise<QuizQuestionData[]> {
    const prompt = `请基于以下知识点生成3道单选题，每道题必须包含4个选项。

知识点：${content}

严格按照以下JSON数组格式返回，不要有任何其他文字，每道题都必须有options数组：
[
  {
    "questionType": "choice",
    "question": "题目内容",
    "options": ["A. 选项一", "B. 选项二", "C. 选项三", "D. 选项四"],
    "correctAnswer": "A. 选项一",
    "explanation": "解析说明"
  },
  {
    "questionType": "choice",
    "question": "题目内容",
    "options": ["A. 选项一", "B. 选项二", "C. 选项三", "D. 选项四"],
    "correctAnswer": "B. 选项二",
    "explanation": "解析说明"
  },
  {
    "questionType": "choice",
    "question": "题目内容",
    "options": ["A. 选项一", "B. 选项二", "C. 选项三", "D. 选项四"],
    "correctAnswer": "C. 选项三",
    "explanation": "解析说明"
  }
]`;

    try {
      let result: string;
      if (this.defaultModel === 'claude') {
        result = await this.claudeChat(prompt);
      } else {
        result = await this.miniMaxChat(prompt);
      }
      return this.parseQuizResult(result);
    } catch (error) {
      console.error('AI生成题目失败:', error);
      return [];
    }
  }

  private parseQuizResult(content: string): QuizQuestionData[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed: QuizQuestionData[] = JSON.parse(jsonMatch[0]);
        return parsed.filter(q => q.question && Array.isArray(q.options) && q.options.length > 0 && q.correctAnswer);
      }
      return [];
    } catch {
      return [];
    }
  }
}