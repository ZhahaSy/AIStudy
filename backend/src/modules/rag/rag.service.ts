import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DocumentChunk } from '../../entities/document-chunk.entity';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly miniMaxApiKey =
    process.env.MINIMAX_API_KEY ||
    'sk-api-D9X-rWFv0kN6P48ks6YBaSAnOPHI_F-4GVFFjlTJVvqYgF-jFoFWo6CieW8eX49tuP1Kt9xAWgQtl8QXTxjaymeyFe694U6GYcHgF5FoX9h354CyM1bCfRw';

  constructor(
    @InjectRepository(DocumentChunk)
    private chunkRepository: Repository<DocumentChunk>,
  ) {}

  async buildIndex(materialId: string, rawContent: string): Promise<void> {
    // 先清理旧数据
    await this.deleteIndex(materialId);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 200,
    });
    const docs = await splitter.createDocuments([rawContent]);
    const texts = docs.map((d) => d.pageContent);

    if (texts.length === 0) return;

    // 批量 embedding，每批 20 条
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += 20) {
      const batch = texts.slice(i, i + 20);
      const embeddings = await this.embedTexts(batch);
      allEmbeddings.push(...embeddings);
    }

    // 存入数据库
    const entities = texts.map((text, idx) =>
      this.chunkRepository.create({
        materialId,
        content: text,
        embedding: JSON.stringify(allEmbeddings[idx]),
        chunkIndex: idx,
      }),
    );

    // 分批保存，每批 50 条
    for (let i = 0; i < entities.length; i += 50) {
      await this.chunkRepository.save(entities.slice(i, i + 50));
    }

    this.logger.log(
      `Built index for material ${materialId}: ${texts.length} chunks`,
    );
  }

  async retrieveChunks(
    materialId: string,
    query: string,
    topK = 8,
  ): Promise<string[]> {
    const chunks = await this.chunkRepository.find({
      where: { materialId },
      order: { chunkIndex: 'ASC' },
    });

    if (chunks.length === 0) {
      throw new Error('No chunks found for this material');
    }

    const [queryEmbedding] = await this.embedTexts([query], 'query');

    const scored = chunks.map((chunk) => ({
      content: chunk.content,
      score: this.cosineSimilarity(
        queryEmbedding,
        JSON.parse(chunk.embedding),
      ),
    }));

    scored.sort((a, b) => b.score - a.score);

    this.logger.debug(
      `Query: "${query}" | Top scores: ${scored
        .slice(0, 5)
        .map((s) => s.score.toFixed(4))
        .join(', ')}`,
    );

    // 过滤掉相似度过低的 chunk（阈值 0.3）
    const filtered = scored
      .slice(0, topK)
      .filter((s) => s.score >= 0.3);

    return filtered.length > 0
      ? filtered.map((s) => s.content)
      : scored.slice(0, topK).map((s) => s.content);
  }

  async deleteIndex(materialId: string): Promise<void> {
    await this.chunkRepository.delete({ materialId });
  }

  private async embedTexts(
    texts: string[],
    type: 'db' | 'query' = 'db',
  ): Promise<number[][]> {
    const response = await fetch(
      'https://api.minimax.chat/v1/embeddings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.miniMaxApiKey}`,
        },
        body: JSON.stringify({
          model: 'embo-01',
          texts,
          type,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`MiniMax Embedding API error: ${response.status} ${err}`);
    }

    
    const data = await response.json();

    if (!data.vectors || !Array.isArray(data.vectors)) {
      this.logger.error(
        `MiniMax Embedding unexpected response: ${JSON.stringify(data).slice(0, 500)}`,
      );
      throw new Error(
        `MiniMax Embedding API returned invalid data: ${data.base_resp?.status_msg || JSON.stringify(data).slice(0, 200)}`,
      );
    }

    return data.vectors;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
