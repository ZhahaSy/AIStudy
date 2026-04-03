import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Upload, message, Tag, Space, Popconfirm } from 'antd'
import { PlusOutlined, UploadOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

interface Material {
  id: string
  title: string
  fileUrl: string
  fileType: string
  status: string
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

  const handleUpload = async (values: { title: string; file: any }) => {
    try {
      setUploading(true)
      
      const formData = new FormData()
      formData.append('title', values.title)
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
      message.loading('正在AI解析...', 0)
      await api.post(`/materials/${id}/analyze`)
      message.destroy()
      message.success('解析完成')
      fetchMaterials()
    } catch (error) {
      message.destroy()
      message.error('解析失败')
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'analyzed' ? 'green' : status === 'failed' ? 'red' : 'default'
        const text = status === 'analyzed' ? '已解析' : status === 'failed' ? '解析失败' : '待解析'
        return <Tag color={color}>{text}</Tag>
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
          {record.status === 'pending' && (
            <Button type="link" size="small" onClick={() => handleAnalyze(record.id)}>
              <PlayCircleOutlined /> AI解析
            </Button>
          )}
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