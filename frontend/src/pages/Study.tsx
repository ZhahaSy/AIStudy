import { useState, useEffect } from 'react'
import { Card, Tabs, Button, Typography, Space, Input, List, Radio, message, Spin, Result, Modal } from 'antd'
import { useParams, useNavigate } from 'react-router-dom'
import { ReadOutlined, CommentOutlined, QuestionCircleOutlined, CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../services/api'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface KnowledgePoint {
  id: string
  chapter: string
  title: string
  content: string
  summary: string
  explanation?: string
}

interface QuizQuestion {
  id: string
  questionType: string
  question: string
  options: string[]
}

interface QuizResult {
  score: number
  totalQuestions: number
  correctCount: number
  results: Array<{
    questionId: string
    question: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    explanation: string
  }>
}

export default function Study() {
  const { planId, chapterId } = useParams<{ planId: string; chapterId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [knowledgePoint, setKnowledgePoint] = useState<KnowledgePoint | null>(null)
  const [activeTab, setActiveTab] = useState('learn')
  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ question: string; answer: string }>>([])
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)

  useEffect(() => {
    if (chapterId) {
      fetchChapterContent()
      fetchChatHistory()
    }
  }, [chapterId])

  const fetchChapterContent = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/study/chapter/${chapterId}/content`)
      setKnowledgePoint(res.data)
    } catch (error) {
      message.error('获取章节内容失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchChatHistory = async () => {
    try {
      const res = await api.get(`/study/chat/${planId}/${chapterId}`)
      setChatHistory(res.data)
    } catch {
      // 历史记录加载失败不影响主流程
    }
  }

  const handleAskQuestion = async () => {
    if (!question.trim()) return

    try {
      setLoading(true)
      const res = await api.post('/study/chat', {
        planId,
        knowledgePointId: chapterId,
        question,
        context: knowledgePoint?.content
      })
      setChatHistory(prev => [...prev, { question, answer: res.data.answer }])
      setQuestion('')
    } catch (error) {
      message.error('提问失败')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQuiz = async () => {
    try {
      setLoading(true)
      const res = await api.post('/study/quiz/generate', { knowledgePointId: chapterId })
      setQuizQuestions(res.data)
      setActiveTab('quiz')
    } catch (error) {
      message.error('生成测验题失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitQuiz = async () => {
    try {
      setSubmitting(true)
      const res = await api.post('/study/quiz/submit', {
        planId,
        knowledgePointId: chapterId,
        answers  // 直接传 Record<questionId, answer>
      })
      setQuizResult(res.data)
      setShowResultModal(true)
    } catch (error) {
      message.error('提交答案失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCompleteChapter = async () => {
    try {
      const score = quizResult?.score ?? 0
      await api.post(`/learning/chapters/${chapterId}/complete`, {
        planId,
        score
      })
      message.success('章节完成')
      navigate(`/learning/${planId}`)
    } catch (error) {
      message.error('操作失败')
    }
  }

  const tabItems = [
    {
      key: 'learn',
      label: (
        <span><ReadOutlined /> 初次学习</span>
      ),
      children: (
        <div>
          <Card style={{ marginBottom: 24 }}>
            <Title level={4}>{knowledgePoint?.title}</Title>
            <Text type="secondary">{knowledgePoint?.chapter}</Text>
          </Card>
          
          <Card title="知识点讲解" style={{ marginBottom: 24 }}>
            <div className="md-answer"><ReactMarkdown remarkPlugins={[remarkGfm]}>
              {knowledgePoint?.explanation || knowledgePoint?.content || '加载中...'}
            </ReactMarkdown></div>
          </Card>

          {knowledgePoint?.summary && (
            <Card title="精简总结" style={{ marginBottom: 24, background: '#f6ffed' }}>
              <div className="md-answer"><ReactMarkdown remarkPlugins={[remarkGfm]}>
                {knowledgePoint.summary}
              </ReactMarkdown></div>
            </Card>
          )}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button type="primary" onClick={() => setActiveTab('qa')}>
              有疑问？去答疑
            </Button>
            <Button type="primary" onClick={handleGenerateQuiz} style={{ marginLeft: 16 }}>
              学完了？去做题
            </Button>
          </div>
        </div>
      )
    },
    {
      key: 'qa',
      label: (
        <span><CommentOutlined /> 答疑</span>
      ),
      children: (
        <div>
          <Card title="学习内容回顾" style={{ marginBottom: 24 }}>
            <div className="md-answer"><ReactMarkdown remarkPlugins={[remarkGfm]}>
              {knowledgePoint?.summary || knowledgePoint?.content || ''}
            </ReactMarkdown></div>
          </Card>

          <Card title="提问" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <TextArea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="请输入你的问题..."
                rows={3}
              />
              <Button type="primary" onClick={handleAskQuestion} loading={loading}>
                提问
              </Button>
            </Space>
          </Card>

          {chatHistory.length > 0 && (
            <Card title="问答记录">
              <List
                dataSource={chatHistory}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<div><QuestionCircleOutlined /> {item.question}</div>}
                      description={
                        <div style={{ marginTop: 4 }}>
                          <CommentOutlined style={{ marginRight: 6 }} />
                          <div className="md-answer"><ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {item.answer}
                          </ReactMarkdown></div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
        </div>
      )
    },
    {
      key: 'quiz',
      label: (
        <span><QuestionCircleOutlined /> 成果检验</span>
      ),
      children: quizQuestions.length === 0 ? (
        <Result
          icon={<QuestionCircleOutlined style={{ color: '#1677ff' }} />}
          title="准备好检验学习成果了吗？"
          subTitle="点击下方按钮生成测验题目"
          extra={
            <Button type="primary" onClick={handleGenerateQuiz} loading={loading}>
              生成测验题
            </Button>
          }
        />
      ) : (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Text>共 {quizQuestions.length} 题，请认真作答</Text>
          </Card>

          {quizQuestions.map((q, index) => (
            <Card key={q.id} style={{ marginBottom: 16 }}>
              <Paragraph strong>
                {index + 1}. {q.question}
              </Paragraph>
              <Radio.Group
                value={answers[q.id]}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              >
                <Space direction="vertical">
                  {q.options?.map((opt, optIndex) => (
                    <Radio key={optIndex} value={opt}>{opt}</Radio>
                  ))}
                </Space>
              </Radio.Group>
            </Card>
          ))}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button 
              type="primary" 
              onClick={handleSubmitQuiz}
              loading={submitting}
              disabled={Object.keys(answers).length < quizQuestions.length}
            >
              提交答案
            </Button>
          </div>
        </div>
      )
    }
  ]

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/learning/${planId}`)}
        style={{ marginBottom: 16 }}
      >
        返回学习计划
      </Button>
      <Spin spinning={loading}>
        <Tabs
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
        />
      </Spin>

      <Modal
        title={quizResult && quizResult.score >= 60 ? "🎉 恭喜通过！" : "📝 测验结果"}
        open={showResultModal}
        onCancel={() => setShowResultModal(false)}
        footer={[
          <Button key="back" onClick={() => setShowResultModal(false)}>
            查看详情
          </Button>,
          <Button key="continue" type="primary" onClick={handleCompleteChapter}>
            {quizResult && quizResult.score >= 60 ? '进入下一章' : '重新学习'}
          </Button>
        ]}
      >
        {quizResult && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Title level={2} style={{ color: quizResult.score >= 60 ? '#52c41a' : '#faad14' }}>
              {quizResult.score}分
            </Title>
            <Text>正确 {quizResult.correctCount}/{quizResult.totalQuestions} 题</Text>
            
            <div style={{ marginTop: 24, textAlign: 'left' }}>
              {quizResult.results.map((result, index) => (
                <div key={index} style={{
                  padding: '12px',
                  marginBottom: 8,
                  background: result.isCorrect ? '#f6ffed' : '#fff2f0',
                  borderRadius: 4
                }}>
                  <Text strong>Q{index + 1}：{result.question}</Text>
                  <div style={{ marginTop: 6 }}>
                    {result.isCorrect
                      ? <Text style={{ color: '#52c41a' }}><CheckCircleOutlined /> 回答正确</Text>
                      : <>
                          <Text type="danger">✗ 你的答案：{result.userAnswer || '未作答'}</Text>
                          <br />
                          <Text style={{ color: '#52c41a' }}>✓ 正确答案：{result.correctAnswer}</Text>
                        </>
                    }
                  </div>
                  {!result.isCorrect && result.explanation && (
                    <div style={{ marginTop: 6 }}>
                      <Text type="secondary">解析：{result.explanation}</Text>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}