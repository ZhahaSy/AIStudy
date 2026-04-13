import { useState, useEffect, useRef } from 'react'
import { Card, Button, Typography, Input, List, message, Spin } from 'antd'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../services/api'

const { Title, Text } = Typography
const { TextArea } = Input

export default function MaterialChat() {
  const { materialId } = useParams<{ materialId: string }>()
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ question: string; answer: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [materialTitle, setMaterialTitle] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (materialId) {
      fetchChatHistory()
      fetchMaterialInfo()
    }
  }, [materialId])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [chatHistory])

  const fetchMaterialInfo = async () => {
    try {
      const res = await api.get(`/materials/${materialId}`)
      setMaterialTitle(res.data.title)
    } catch {
      // ignore
    }
  }

  const fetchChatHistory = async () => {
    try {
      const res = await api.get(`/study/material-chat/${materialId}`)
      setChatHistory(res.data)
    } catch {
      // ignore
    }
  }

  const handleAsk = async () => {
    if (!question.trim()) return
    const q = question.trim()
    setQuestion('')
    setChatHistory(prev => [...prev, { question: q, answer: '' }])
    setSubmitting(true)
    try {
      const res = await api.post('/study/material-chat', {
        materialId,
        question: q,
      })
      setChatHistory(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = res.data
        return updated
      })
    } catch {
      message.error('提问失败，请重试')
      setChatHistory(prev => prev.slice(0, -1))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/materials')}
        style={{ marginBottom: 16 }}
      >
        返回资料列表
      </Button>

      <Card
        title={<Title level={4} style={{ margin: 0 }}>直接提问{materialTitle ? ` - ${materialTitle}` : ''}</Title>}
        style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 24px' } }}
      >
        <div ref={listRef} style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
          {chatHistory.length === 0 && !submitting && (
            <div style={{ textAlign: 'center', color: '#999', marginTop: 60 }}>
              <Text type="secondary">针对这份资料的所有内容自由提问吧</Text>
            </div>
          )}
          <List
            dataSource={chatHistory}
            renderItem={(item, index) => (
              <div key={index} style={{ marginBottom: 16 }}>
                <div style={{ background: '#e6f7ff', padding: '8px 12px', borderRadius: 8, marginBottom: 8 }}>
                  <Text strong>Q：</Text>{item.question}
                </div>
                <div style={{ background: '#f6f6f6', padding: '8px 12px', borderRadius: 8 }}>
                  {item.answer ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
                  ) : (
                    <Spin size="small" />
                  )}
                </div>
              </div>
            )}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <TextArea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="输入你的问题..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={e => {
              if (!e.shiftKey) {
                e.preventDefault()
                handleAsk()
              }
            }}
            disabled={submitting}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleAsk}
            loading={submitting}
            disabled={!question.trim()}
          >
            发送
          </Button>
        </div>
      </Card>
    </div>
  )
}
