import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Upload, message, Tag, Space, Popconfirm, Radio, Tooltip } from 'antd'
import { PlusOutlined, UploadOutlined, DeleteOutlined, PlayCircleOutlined, ThunderboltOutlined, BookOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

interface Material {
  id: string
  title: string
  fileUrl: string
  fileType: string
  status: string
  analyzeMode: string
  createdAt: string
}

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const res = await api.get('/materials')
      setMaterials(res.data)
    } catch (error) {
      message.error('获取资料失败')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (values: { title: string; file: any; analyzeMode: 'quick' | 'deep' }) => {
    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('analyzeMode', values.analyzeMode || 'quick')
      if (values.file?.file) {
        formData.append('file', values.file.file)
      }
      
      await api.post('/materials/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      message.success('上传成功')
      setModalVisible(false)
      form.resetFields()
      fetchMaterials()
    } catch (error: any) {
      console.error('上传失败:', error)
      message.error(error.response?.data?.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleAnalyze = async (id: string) => {
    try {
      message.loading({ content: '正在AI解析，请耐心等待...', key: 'analyze', duration: 0 })
      await api.post(`/materials/${id}/analyze`)

      // 轮询状态，最多等 5 分钟
      const maxAttempts = 60
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 5000))
        const res = await api.get(`/materials/${id}`)
        if (res.data.status === 'analyzed') {
          message.success({ content: '解析完成', key: 'analyze' })
          fetchMaterials()
          return
        }
        if (res.data.status === 'failed') {
          message.error({ content: '解析失败', key: 'analyze' })
          fetchMaterials()
          return
        }
      }
      message.warning({ content: '解析超时，请稍后刷新查看结果', key: 'analyze' })
    } catch (error) {
      message.error({ content: '解析请求失败', key: 'analyze' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/materials/${id}`)
      message.success('删除成功')
      fetchMaterials()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleStartLearning = async (materialId: string) => {
    try {
      // 先查是否已有该 material 的学习计划
      const plansRes = await api.get('/learning/plans')
      const existing = plansRes.data.find((p: { materialId: string; id: string }) => p.materialId === materialId)
      if (existing) {
        navigate(`/learning/${existing.id}`)
        return
      }
      const res = await api.post('/learning/plans', { materialId })
      message.success('学习计划已创建')
      navigate(`/learning/${res.data.id}`)
    } catch (error) {
      message.error('创建学习计划失败')
    }
  }

  const columns = [
    {
      title: '资料名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '文件类型',
      dataIndex: 'fileType',
      key: 'fileType',
      render: (type: string) => <Tag color="blue">{type?.toUpperCase() || 'PDF'}</Tag>,
    },
    {
      title: '解析模式',
      dataIndex: 'analyzeMode',
      key: 'analyzeMode',
      render: (mode: string) => mode === 'deep'
        ? <Tag color="purple" icon={<BookOutlined />}>细致版</Tag>
        : <Tag color="orange" icon={<ThunderboltOutlined />}>快速版</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const map: Record<string, { color: string; text: string }> = {
          analyzed: { color: 'green', text: '已解析' },
          analyzing: { color: 'processing', text: '解析中...' },
          failed: { color: 'red', text: '解析失败' },
        }
        const s = map[status] || { color: 'default', text: '待解析' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Material) => (
        <Space>
          {record.status === 'pending' || record.status === 'failed' ? (
            <Button type="link" size="small" onClick={() => handleAnalyze(record.id)}>
              <PlayCircleOutlined /> AI解析
            </Button>
          ) : null}
          {record.status === 'analyzed' && (
            <Button type="link" size="small" onClick={() => handleStartLearning(record.id)}>
              开始学习
            </Button>
          )}
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>
              <DeleteOutlined />
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>学习资料</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          上传资料
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={materials}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="上传学习资料"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpload}
        >
          <Form.Item
            name="title"
            label="资料名称"
            rules={[{ required: true, message: '请输入资料名称' }]}
          >
            <Input placeholder="例如：Python入门教程" />
          </Form.Item>
          <Form.Item
            name="analyzeMode"
            label="解析模式"
            initialValue="quick"
            rules={[{ required: true }]}
          >
            <Radio.Group>
              <Radio.Button value="quick">
                <Tooltip title="快速提取3-5个核心知识点，适合快速了解">
                  <ThunderboltOutlined /> 快速版
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="deep">
                <Tooltip title="深度分析6-10个知识点，内容详细，适合系统学习">
                  <BookOutlined /> 细致版
                </Tooltip>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="file"
            label="上传文件"
            rules={[{ required: true, message: '请上传文件' }]}
          >
            <Upload maxCount={1} beforeUpload={() => false}>
              <Button icon={<UploadOutlined />}>点击上传</Button>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={uploading} block>
              上传
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}