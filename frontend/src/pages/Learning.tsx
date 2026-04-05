import { useState, useEffect } from 'react'
import { Card, Steps, Button, Typography, Space, message, Spin, Progress } from 'antd'
import { useParams, useNavigate } from 'react-router-dom'
import { ReadOutlined, CheckCircleOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import api from '../services/api'

const { Title, Text } = Typography

interface ProgressItem {
  id: string
  knowledgePointId: string
  status: string
  quizScore?: number
  knowledgePoint: {
    chapter: string
    title: string
    summary: string
  }
}

interface LearningPlan {
  id: string
  status: string
  material: {
    title: string
  }
}

export default function Learning() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<LearningPlan | null>(null)
  const [progressList, setProgressList] = useState<ProgressItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (planId) {
      fetchPlan()
      fetchProgress()
    }
  }, [planId])

  const fetchPlan = async () => {
    try {
      const res = await api.get(`/learning/plans/${planId}`)
      setPlan(res.data)
    } catch (error) {
      message.error('获取学习计划失败')
    }
  }

  const fetchProgress = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/learning/plans/${planId}/progress`)
      setProgressList(res.data)
    } catch (error) {
      message.error('获取学习进度失败')
    } finally {
      setLoading(false)
    }
  }

  const goToStudy = (progress: ProgressItem) => {
    if (progress.status !== 'locked') {
      navigate(`/study/${planId}/${progress.knowledgePointId}`)
    }
  }

  const completedCount = progressList.filter(p => p.status === 'quiz_passed' || p.status === 'completed').length
  const totalCount = progressList.length

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'quiz_passed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#1890ff' }} />
      case 'in_progress':
        return <ReadOutlined style={{ color: '#1677ff' }} />
      case 'locked':
        return <LockOutlined style={{ color: '#bfbfbf' }} />
      default:
        return <LockOutlined />
    }
  }

  const getStatusText = (status: string, score?: number) => {
    switch (status) {
      case 'quiz_passed':
        return `已掌握 (${score}分)`
      case 'completed':
        return '学习中'
      case 'in_progress':
        return '待学习'
      case 'locked':
        return '未解锁'
      default:
        return ''
    }
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/materials')}
        style={{ marginBottom: 16 }}
      >
        返回资料列表
      </Button>

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>{plan?.material?.title || '学习计划'}</Title>
        <Space style={{ marginBottom: 16 }}>
          <Text type="secondary">学习进度：</Text>
          <Progress percent={totalCount ? Math.round((completedCount / totalCount) * 100) : 0} status="active" />
        </Space>
        <Text type="secondary">
          已完成 {completedCount}/{totalCount} 个章节
        </Text>
      </Card>

      <Spin spinning={loading}>
        <Steps
          direction="vertical"
          current={progressList.findIndex(p => p.status === 'in_progress' || p.status === 'completed')}
          items={progressList.map((progress) => ({
            title: (
              <div 
                style={{ 
                  cursor: progress.status !== 'locked' ? 'pointer' : 'default',
                  opacity: progress.status === 'locked' ? 0.5 : 1
                }}
                onClick={() => goToStudy(progress)}
              >
                <Space>
                  {getStatusIcon(progress.status)}
                  <span>{progress.knowledgePoint?.chapter}</span>
                </Space>
              </div>
            ),
            description: (
              <div>
                <div style={{ fontWeight: 500 }}>{progress.knowledgePoint?.title}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>
                  {progress.knowledgePoint?.summary}
                </div>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {getStatusText(progress.status, progress.quizScore)}
                  </Text>
                </div>
              </div>
            ),
          }))}
        />
      </Spin>

      {progressList.length > 0 && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Button type="primary" onClick={() => {
            const nextProgress = progressList.find(p => p.status === 'in_progress' || p.status === 'completed')
            if (nextProgress) {
              navigate(`/study/${planId}/${nextProgress.knowledgePointId}`)
            }
          }}>
            继续学习
          </Button>
        </div>
      )}
    </div>
  )
}