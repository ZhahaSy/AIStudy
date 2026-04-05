# AIStudy 项目知识库文档

> 生成日期：2026-04-05

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [目录结构](#3-目录结构)
4. [数据模型](#4-数据模型)
5. [后端模块详解](#5-后端模块详解)
6. [前端模块详解](#6-前端模块详解)
7. [核心业务流程](#7-核心业务流程)
8. [API 接口总览](#8-api-接口总览)
9. [调用链路图](#9-调用链路图)

---

## 1. 项目概述

AIStudy 是一个 AI 驱动的学习平台。用户上传 PDF 学习资料后，系统通过 AI（MiniMax / Claude）自动提取知识点、生成学习计划，并在学习过程中提供 AI 问答和章节测验，通过"解锁"机制推动用户逐章学习。

---

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript + Vite |
| 前端路由 | React Router v6 |
| 前端状态 | Zustand（持久化到 localStorage） |
| 前端 UI | Ant Design |
| HTTP 客户端 | Axios（自动注入 JWT） |
| 后端框架 | NestJS 10 |
| ORM | TypeORM |
| 数据库 | SQLite（文件：`backend/study.db`） |
| 认证 | JWT（Passport + jwt-auth.guard） |
| AI 服务 | MiniMax（默认）/ Claude（备用） |
| 文件存储 | 本地磁盘 `backend/uploads/`，静态服务 |

---

## 3. 目录结构

```
AIStudy/
├── backend/
│   └── src/
│       ├── main.ts                        # 启动入口，配置 CORS、静态文件、全局前缀
│       ├── app.module.ts                  # 根模块，注册所有子模块与 TypeORM
│       ├── entities/                      # 数据库实体（7 张表）
│       │   ├── user.entity.ts
│       │   ├── material.entity.ts
│       │   ├── knowledge-point.entity.ts
│       │   ├── learning-plan.entity.ts
│       │   ├── learning-progress.entity.ts
│       │   ├── quiz-question.entity.ts
│       │   └── quiz-record.entity.ts
│       └── modules/
│           ├── auth/                      # 注册 / 登录 / JWT
│           ├── user/                      # 用户信息
│           ├── material/                  # 资料上传与 AI 解析
│           ├── learning/                  # 学习计划与进度
│           ├── study/                     # 学习会话、AI 问答、测验
│           └── ai/                        # AI 服务封装（MiniMax / Claude）
└── frontend/
    └── src/
        ├── main.tsx                       # React 挂载入口
        ├── App.tsx                        # 路由定义 + PrivateRoute
        ├── services/api.ts                # Axios 实例（JWT 拦截器）
        ├── stores/auth.ts                 # Zustand 认证状态
        └── pages/
            ├── Login.tsx
            ├── Register.tsx
            ├── Home.tsx                   # 仪表盘
            ├── Materials.tsx              # 资料管理
            ├── Learning.tsx               # 学习计划
            ├── Study.tsx                  # 学习会话（学习/问答/测验）
            └── UserCenter.tsx             # 个人中心
```

---

## 4. 数据模型

### 实体关系

```
User (1)
 ├─(1:N)─ Material          用户上传的资料
 │          ├─(1:N)─ KnowledgePoint    AI 提取的知识点
 │          └─(1:N)─ QuizQuestion      AI 生成的题目
 ├─(1:N)─ LearningPlan      学习计划（每份资料对应一个）
 │          └─(1:N)─ LearningProgress  每个知识点的学习进度
 └─(1:N)─ QuizRecord        测验记录
```

### 各实体字段说明

#### User
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 主键 |
| username | string | 用户名 |
| email | string | 邮箱（唯一） |
| password | string | 密码（明文存储，待改进） |
| avatar | string | 头像 URL |
| createdAt | Date | 注册时间 |

#### Material
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 主键 |
| title | string | 资料标题 |
| filename | string | 磁盘文件名 |
| originalName | string | 原始文件名 |
| filePath | string | 磁盘路径 |
| fileSize | number | 文件大小（字节） |
| status | enum | `pending` / `analyzing` / `ready` / `failed` |
| userId | number | 所属用户 |

#### KnowledgePoint
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 主键 |
| chapter | string | 章节名 |
| chapterIndex | number | 章节序号（用于排序与解锁） |
| title | string | 知识点标题 |
| content | string | 详细内容 |
| summary | string | 摘要 |
| materialId | number | 所属资料 |

#### LearningPlan
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 主键 |
| totalChapters | number | 总章节数 |
| completedChapters | number | 已完成章节数 |
| userId / materialId | number | 关联 |

#### LearningProgress
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 主键 |
| chapterIndex | number | 对应章节序号 |
| status | enum | `locked` / `learning` / `completed` |
| isUnlocked | boolean | 是否解锁 |
| quizScore | number | 该章节测验最高分 |
| planId / knowledgePointId | number | 关联 |

#### QuizQuestion
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 主键 |
| questionType | string | 题型（单选等） |
| question | string | 题目 |
| options | string[] | 选项（JSON 存储） |
| correctAnswer | string | 正确答案 |
| explanation | string | 解析 |
| chapterIndex | number | 所属章节 |
| materialId | number | 所属资料 |

#### QuizRecord
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 主键 |
| score | number | 得分 |
| totalQuestions | number | 题目总数 |
| correctCount | number | 答对数 |
| answers | object | 用户答案（JSON） |
| userId / materialId | number | 关联 |

---

## 5. 后端模块详解

### 5.1 main.ts — 启动入口

- 监听端口 `3000`
- 开启 CORS（允许所有来源）
- 全局路由前缀 `/api`
- 静态文件服务：`/uploads` → `./uploads/`

### 5.2 app.module.ts — 根模块

- TypeORM 连接 SQLite，`synchronize: true`（自动建表）
- 注册所有子模块：AuthModule、UserModule、MaterialModule、LearningModule、StudyModule

---

### 5.3 auth 模块

**文件：** `auth.controller.ts` / `auth.service.ts` / `jwt.strategy.ts` / `jwt-auth.guard.ts`

#### 职责
- 用户注册、登录，签发 JWT

#### 接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册（username, email, password） |
| POST | `/api/auth/login` | 登录，返回 `{ token, user }` |

#### 调用链
```
POST /api/auth/login
  → AuthController.login()
  → AuthService.login()
    → UserRepository.findOne({ email })
    → 比对密码（明文）
    → JwtService.sign({ sub: user.id, email })
    → 返回 { token, user }
```

#### jwt-auth.guard
- 所有需要认证的路由加 `@UseGuards(JwtAuthGuard)`
- `JwtStrategy.validate()` 从 token 中解析 `userId`，注入 `req.user`

---

### 5.4 user 模块

**文件：** `user.controller.ts` / `user.service.ts`

#### 接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/profile` | 获取当前用户信息 |
| PUT | `/api/user/profile` | 更新用户名/头像 |
| GET | `/api/user/stats` | 获取学习统计（资料数、知识点数、完成章节数） |

#### 调用链
```
GET /api/user/stats
  → UserController.getStats()
  → UserService.getUserStats(userId)
    → MaterialRepository.count({ userId })
    → KnowledgePointRepository.count（关联 material）
    → LearningProgressRepository.count({ status: 'completed' })
    → 返回聚合统计
```

---

### 5.5 material 模块

**文件：** `material.controller.ts` / `material.service.ts`

#### 职责
- 接收 PDF 上传，触发 AI 异步解析，管理资料列表

#### 接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/material/upload` | 上传 PDF（multipart/form-data） |
| GET | `/api/material/list` | 获取用户资料列表 |
| DELETE | `/api/material/:id` | 删除资料及关联数据 |
| POST | `/api/material/:id/analyze` | 手动触发 AI 解析 |

#### 调用链（上传 + 解析）
```
POST /api/material/upload
  → MaterialController.upload()
  → Multer 保存文件到 ./uploads/
  → MaterialService.create()
    → MaterialRepository.save({ status: 'pending', ... })
    → MaterialService.analyze(materialId)  ← 异步，不阻塞响应
      → 读取文件（PDF → pdfParse 提取文本）
      → AiService.analyzeMaterial(text, title)
        → 文本分块（chunkText，每块 ≤1800 字符）
        → 逐块调用 AiService.buildCondensedSummary()
          → MiniMax/Claude API → 返回摘要
        → 合并摘要，调用 AiService.analyzeWithMiniMax/Claude()
          → 返回 KnowledgePointData[]（JSON）
      → KnowledgePointRepository.save(knowledgePoints[])
      → LearningService.createPlan(userId, materialId, knowledgePoints)
        → LearningPlanRepository.save()
        → LearningProgressRepository.save()（第 0 章解锁，其余 locked）
      → MaterialRepository.update({ status: 'ready' })
```

---

### 5.6 learning 模块

**文件：** `learning.controller.ts` / `learning.service.ts`

#### 职责
- 管理学习计划与章节进度，控制章节解锁逻辑

#### 接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/learning/plan/:materialId` | 获取学习计划及进度列表 |
| POST | `/api/learning/progress/:progressId/start` | 开始学习某章节 |
| POST | `/api/learning/progress/:progressId/complete` | 完成章节（解锁下一章） |

#### 解锁逻辑
```
LearningService.completeChapter(progressId)
  → 将当前 progress.status = 'completed'
  → 查找 chapterIndex + 1 的 progress
  → 若存在且 isUnlocked = false → 设为 isUnlocked = true, status = 'learning'
  → LearningPlanRepository.update({ completedChapters++ })
```

---

### 5.7 study 模块

**文件：** `study.controller.ts` / `study.service.ts`

#### 职责
- 提供学习内容、AI 问答、测验生成与提交

#### 接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/study/content/:materialId/:chapterIndex` | 获取章节知识点内容 |
| POST | `/api/study/chat` | AI 问答（基于章节内容） |
| POST | `/api/study/quiz/generate` | 生成章节测验题 |
| POST | `/api/study/quiz/submit` | 提交答案，返回得分 |
| GET | `/api/study/quiz/records` | 获取历史测验记录 |

#### 调用链（AI 问答）
```
POST /api/study/chat  { materialId, chapterIndex, question }
  → StudyController.chat()
  → StudyService.chat(userId, materialId, chapterIndex, question)
    → KnowledgePointRepository.find({ materialId, chapterIndex })
    → 拼接 context（知识点内容）
    → AiService.answerQuestion(context, question)
      → 构造 prompt
      → MiniMaxChat() 或 ClaudeChat()
      → 返回 AI 回答文本
```

#### 调用链（测验生成）
```
POST /api/study/quiz/generate  { materialId, chapterIndex }
  → StudyService.generateQuiz()
    → 检查数据库是否已有题目（有则直接返回）
    → KnowledgePointRepository.find({ materialId, chapterIndex })
    → AiService.generateQuiz(knowledgePoints)
      → 构造 prompt（要求返回 JSON 题目数组）
      → MiniMaxChat() 或 ClaudeChat()
      → 解析 JSON → QuizQuestionData[]
    → QuizQuestionRepository.save(questions)
    → 返回题目列表（不含正确答案）
```

#### 调用链（测验提交）
```
POST /api/study/quiz/submit  { materialId, chapterIndex, answers }
  → StudyService.submitQuiz()
    → 查询题目正确答案
    → 逐题比对，计算 score
    → QuizRecordRepository.save({ score, answers, ... })
    → 若 score >= 60：LearningService.completeChapter(progressId)
    → 返回 { score, correctCount, totalQuestions, passed }
```

---

### 5.8 ai 模块

**文件：** `ai.service.ts`

#### 职责
- 封装所有 AI API 调用，对上层屏蔽具体 AI 提供商

#### 配置
| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ANTHROPIC_BASE_URL` | `http://api-ai-coding.bilibili.co/v1` | Claude 代理地址 |
| `ANTHROPIC_AUTH_TOKEN` | `sk-aicoding-...` | Claude API Key |
| `MINIMAX_API_KEY` | `sk-api-...` | MiniMax API Key |
| `defaultModel` | `miniMax` | 当前使用的 AI 提供商 |

#### 核心方法

| 方法 | 说明 |
|------|------|
| `analyzeMaterial(text, title)` | 主入口：分块 → 摘要 → 提取知识点 |
| `buildCondensedSummary(chunk)` | 单块文本 → 摘要（压缩上下文） |
| `analyzeWithMiniMax/Claude(prompt, title)` | 调用 AI，解析返回的 JSON 知识点数组 |
| `generateQuiz(knowledgePoints)` | 基于知识点生成测验题 JSON |
| `answerQuestion(context, question)` | 基于上下文回答用户问题 |
| `miniMaxChat(prompt)` | MiniMax API 底层调用 |
| `claudeChat(prompt)` | Claude API 底层调用 |

#### 文本分块策略
```
chunkText(text, chunkSize=1800)
  → 按双换行分段
  → 累积段落，超过 chunkSize 则新建块
  → 单段超长则强制按 chunkSize 截断
```

---

## 6. 前端模块详解

### 6.1 main.tsx — 挂载入口
- 挂载 React 到 `#root`，包裹 `<App />`

### 6.2 App.tsx — 路由
```
/login          → Login（公开）
/register       → Register（公开）
/               → PrivateRoute → Home
/materials      → PrivateRoute → Materials
/learning/:id   → PrivateRoute → Learning
/study/:id/:ch  → PrivateRoute → Study
/user           → PrivateRoute → UserCenter
```
`PrivateRoute`：读取 Zustand `token`，无 token 则重定向 `/login`

### 6.3 services/api.ts — HTTP 客户端
- Axios 实例，`baseURL = http://localhost:3000/api`
- 请求拦截器：从 Zustand store 读取 `token`，注入 `Authorization: Bearer <token>`
- 响应拦截器：401 时清除 token 并跳转 `/login`

### 6.4 stores/auth.ts — 认证状态
```typescript
{
  token: string | null,
  user: User | null,
  setAuth(token, user): void,   // 登录后调用
  clearAuth(): void,             // 登出时调用
}
```
使用 Zustand `persist` 中间件持久化到 `localStorage`（key: `auth-storage`）

### 6.5 页面说明

#### Login.tsx / Register.tsx
- 表单提交 → `POST /api/auth/login` 或 `/register`
- 成功后 `authStore.setAuth(token, user)` → 跳转 `/`

#### Home.tsx — 仪表盘
- 加载 `GET /api/user/stats`（资料数、知识点数、完成章节数）
- 加载 `GET /api/material/list`（最近资料）
- 展示统计卡片 + 资料列表

#### Materials.tsx — 资料管理
- 列表：`GET /api/material/list`
- 上传：`POST /api/material/upload`（multipart），轮询状态直到 `ready`
- 删除：`DELETE /api/material/:id`
- 点击资料 → 跳转 `/learning/:materialId`

#### Learning.tsx — 学习计划
- 加载 `GET /api/learning/plan/:materialId`
- 展示章节列表，显示锁定/进行中/已完成状态
- 点击解锁章节 → 跳转 `/study/:materialId/:chapterIndex`

#### Study.tsx — 学习会话（核心页面）
三个 Tab：

| Tab | 功能 |
|-----|------|
| 学习 | 展示知识点内容，点击"完成学习"触发 `completeChapter` |
| AI 问答 | 输入问题 → `POST /api/study/chat` → 展示对话 |
| 章节测验 | 生成题目 → 答题 → 提交 → 展示得分与解析 |

#### UserCenter.tsx — 个人中心
- 展示用户信息与学习统计
- 支持修改用户名/头像（`PUT /api/user/profile`）

---

## 7. 核心业务流程

### 流程一：资料上传与 AI 解析

```
用户上传 PDF
  → Materials.tsx: POST /api/material/upload
  → 后端保存文件，status=pending
  → 异步触发 MaterialService.analyze()
    → pdf-parse 提取文本
    → AiService.analyzeMaterial()
      → 分块 → 逐块摘要 → 合并 → 提取知识点 JSON
    → 保存 KnowledgePoint[]
    → LearningService.createPlan()
      → 创建 LearningPlan
      → 创建 LearningProgress[]（第0章 unlocked，其余 locked）
    → status=ready
  → 前端轮询状态，ready 后刷新列表
```

### 流程二：章节学习与解锁

```
用户进入 Learning.tsx
  → 查看章节列表（locked/learning/completed）
  → 点击已解锁章节 → Study.tsx
    → 学习 Tab：阅读知识点
    → 点击"完成学习"
      → POST /api/learning/progress/:id/complete
      → 后端解锁下一章节
    → 测验 Tab：生成题目 → 答题 → 提交
      → score >= 60 → 自动 completeChapter（解锁下一章）
```

### 流程三：AI 问答

```
用户在 Study.tsx 问答 Tab 输入问题
  → POST /api/study/chat { materialId, chapterIndex, question }
  → 后端查询该章节知识点作为上下文
  → AiService.answerQuestion(context, question)
    → 构造 prompt（含知识点内容 + 用户问题）
    → 调用 MiniMax 或 Claude API
    → 返回回答
  → 前端展示对话气泡
```

---

## 8. API 接口总览

| 模块 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| Auth | POST | `/api/auth/register` | 否 | 注册 |
| Auth | POST | `/api/auth/login` | 否 | 登录 |
| User | GET | `/api/user/profile` | 是 | 获取个人信息 |
| User | PUT | `/api/user/profile` | 是 | 更新个人信息 |
| User | GET | `/api/user/stats` | 是 | 学习统计 |
| Material | POST | `/api/material/upload` | 是 | 上传资料 |
| Material | GET | `/api/material/list` | 是 | 资料列表 |
| Material | DELETE | `/api/material/:id` | 是 | 删除资料 |
| Material | POST | `/api/material/:id/analyze` | 是 | 手动触发解析 |
| Learning | GET | `/api/learning/plan/:materialId` | 是 | 获取学习计划 |
| Learning | POST | `/api/learning/progress/:id/start` | 是 | 开始章节 |
| Learning | POST | `/api/learning/progress/:id/complete` | 是 | 完成章节 |
| Study | GET | `/api/study/content/:materialId/:ch` | 是 | 获取章节内容 |
| Study | POST | `/api/study/chat` | 是 | AI 问答 |
| Study | POST | `/api/study/quiz/generate` | 是 | 生成测验 |
| Study | POST | `/api/study/quiz/submit` | 是 | 提交答案 |
| Study | GET | `/api/study/quiz/records` | 是 | 测验记录 |

---

## 9. 调用链路图

### 后端模块依赖

```
MaterialModule
  └─ depends on ─→ AiModule
  └─ depends on ─→ LearningModule

StudyModule
  └─ depends on ─→ AiModule
  └─ depends on ─→ LearningModule

LearningModule（独立）
UserModule（独立）
AuthModule（独立）
```

### 完整请求链路示例（生成测验）

```
Browser
  │  POST /api/study/quiz/generate
  ▼
StudyController.generateQuiz()          [study.controller.ts]
  │
  ▼
StudyService.generateQuiz()             [study.service.ts]
  │  查询 KnowledgePoint（TypeORM）
  │
  ▼
AiService.generateQuiz()                [ai.service.ts]
  │  构造 prompt
  │
  ▼
AiService.miniMaxChat()                 [ai.service.ts]
  │  fetch → https://api.minimax.chat/v1/text/chatcompletion_v2
  │
  ▼
MiniMax API（外部）
  │  返回 JSON 字符串
  │
  ▼
AiService（解析 JSON → QuizQuestionData[]）
  │
  ▼
StudyService（保存到 QuizQuestion 表）
  │
  ▼
返回题目列表（不含答案）→ Browser
```
