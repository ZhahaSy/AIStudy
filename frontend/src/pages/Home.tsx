import { useState, useEffect } from 'react'
import { Card, Row, Col, Button, Statistic, List, Typography, Spin } from 'antd'
import { BookOutlined, ReadOutlined, PlusOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

const { Title, Text } = Typography

interface LearningPlan {
  id: string
  status: string
  material: {
    title: string
  }
  createdAt: string
}

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<LearningPlan[]>([])
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const res = await api.get('/learning/plans')
      setPlans(res.data)
    } catch (error) {
      console.error('获取学习计划失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const continueLearning = (planId: string) => {
    navigate(`/learning/${planId}`)
  }

  const goToMaterials = () => {
    navigate('/materials')
  }

  const inProgressCount = plans.filter(p => p.status === 'in_progress').length
  const completedCount = plans.filter(p => p.status === 'completed').length

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Title level={2}>欢迎回来，{user?.nickname || '学习者'} 👋</Title>
        <Text type="secondary">每天进步一点点，遇见更好的自己</Text>
      </div>

      <Row gutter={24} style={{ marginBottom: 32 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="进行中的学习"
              value={inProgressCount}
              prefix={<ReadOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已完成学习"
              value={completedCount}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={goToMaterials} style={{ cursor: 'pointer' }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <PlusOutlined style={{ fontSize: 32, color: '#1677ff' }} />
              <div style={{ marginTop: 8 }}>上传新资料</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card 
        title="学习计划" 
        extra={<Button type="link" onClick={goToMaterials}>查看全部资料</Button>}
      >
        <Spin spinning={loading}>
          {plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary">暂无学习计划</Text>
              <div style={{ marginTop: 16 }}>
                <Button type="primary" onClick={goToMaterials}>
                  开始学习
                </Button>
              </div>
            </div>
          ) : (
            <List
              dataSource={plans.slice(0, 5)}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button 
                      type="link" 
                      onClick={() => continueLearning(item.id)}
                      key="continue"
                    >
                      继续学习 <ArrowRightOutlined />
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<BookOutlined style={{ fontSize: 24, color: '#1677ff' }} />}
                    title={item.material?.title || '未命名学习'}
                    description={`创建于 ${new Date(item.createdAt).toLocaleDateString()}`}
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>
    </div>
  )
}