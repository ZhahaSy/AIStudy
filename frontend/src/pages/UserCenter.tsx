import { useState, useEffect } from 'react'
import { Card, Avatar, Typography, Space, Button, Descriptions } from 'antd'
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const { Title, Text } = Typography

export default function UserCenter() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [stats, setStats] = useState({
    totalPlans: 0,
    completedPlans: 0,
    totalLearningTime: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await api.get('/user/stats')
      setStats(res.data)
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <Avatar size={80} icon={<UserOutlined />} src={user?.avatar} />
          <div style={{ marginLeft: 24 }}>
            <Title level={3} style={{ marginBottom: 8 }}>{user?.nickname || '学习者'}</Title>
            <Text type="secondary">{user?.email}</Text>
          </div>
        </div>

        <Descriptions bordered column={1}>
          <Descriptions.Item label="昵称">{user?.nickname || '-'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user?.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="学习计划数">{stats.totalPlans}</Descriptions.Item>
          <Descriptions.Item label="已完成计划">{stats.completedPlans}</Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 24 }}>
          <Space>
            <Button icon={<SettingOutlined />}>设置</Button>
            <Button icon={<LogoutOutlined />} danger onClick={handleLogout}>
              退出登录
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  )
}