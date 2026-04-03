import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as pdfParse from 'pdf-parse';

interface KnowledgePointData {
  chapter: string;
  chapterIndex: number;
  title: string;
  content: string;
  summary: string;
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
  private claudeBaseUrl = process.env.ANTHROPIC_BASE_URL || 'http://api-ai-coding.bilibili.co/api';
  private claudeApiKey = process.env.ANTHROPIC_AUTH_TOKEN || 'sk-aicoding-qA3uksT7ngB7cwcqq2tp7yQkp5kAWLSf';
  
  private miniMaxApiKey = process.env.MINIMAX_API_KEY || 'sk-api-D9X-rWFv0kN6P48ks6YBaSAnOPHI_F-4GVFFjlTJVvqYgF-jFoFWo6CieW8eX49tuP1Kt9xAWgQtl8QXTxjaymeyFe694U6GYcHgF5FoX9h354CyM1bCfRw';
  private miniMaxBaseUrl = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

  private defaultModel = 'claude';

  private async extractFileContent(fileUrl: string): Promise<string> {
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

  async analyzeMaterial(fileUrl: string, title: string): Promise<KnowledgePointData[]> {
    const fileContent = await this.extractFileContent(fileUrl);
    const contentSnippet = fileContent.slice(0, 8000); // 截取前8000字符避免超长

    const prompt = `
请分析以下学习资料，提取关键知识点。
资料标题：${title}
${contentSnippet ? `\n资料内容：\n${contentSnippet}\n` : ''}
请按照以下JSON格式返回知识点列表：
[
  {
    "chapter": "章节名称",
    "chapterIndex": 章节序号,
    "title": "知识点标题",
    "content": "知识点详细内容",
    "summary": "精简总结（适合'知道就好'的程度）"
  }
]

请提取3-5个核心知识点。
`;

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      });

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
          model: 'abab6.5s-chat',
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

  async explainKnowledgePoint(knowledgePointId: string, content: string): Promise<string> {
    const prompt = `请用通俗易懂的方式解释以下知识点，确保简洁明了，适合快速学习：

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

  async answerQuestion(question: string, context: string): Promise<string> {
    const prompt = `基于以下学习内容，请回答用户的问题：

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      });

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
          model: 'abab6.5s-chat',
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

  async generateQuiz(knowledgePointId: string, content: string): Promise<QuizQuestionData[]> {
    const prompt = `请基于以下知识点生成3道测验题目：

知识点：${content}

请返回以下JSON格式的题目：
[
  {
    "questionType": "choice",
    "question": "题目内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "correctAnswer": "正确答案",
    "explanation": "解析"
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
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch {
      return [];
    }
  }
}