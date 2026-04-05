import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { Layout, Menu } from 'antd'
import {
  HomeOutlined,
  FolderOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Materials from './pages/Materials'
import Learning from './pages/Learning'
import Study from './pages/Study'
import UserCenter from './pages/UserCenter'

const { Sider, Content } = Layout

const NAV_ITEMS = [
  { key: '/home', icon: <HomeOutlined />, label: '首页' },
  { key: '/materials', icon: <FolderOutlined />, label: '学习资料' },
  { key: '/user', icon: <UserOutlined />, label: '个人中心' },
]

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" />
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const selectedKey = NAV_ITEMS.find(item =>
    location.pathname.startsWith(item.key)
  )?.key ?? ''

  const menuItems = [
    ...NAV_ITEMS.map(item => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
      onClick: () => navigate(item.key),
    })),
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => { logout(); navigate('/login') },
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={200}
        style={{ borderRight: '1px solid #f0f0f0', position: 'fixed', height: '100vh', left: 0, top: 0 }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}>AIStudy</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout style={{ marginLeft: 200 }}>
        <Content style={{ padding: 24, minHeight: '100vh', background: '#f5f5f5' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

function App() {
  const { token } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to={token ? '/home' : '/login'} />} />
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <AppLayout><Home /></AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/materials"
        element={
          <PrivateRoute>
            <AppLayout><Materials /></AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/learning/:planId"
        element={
          <PrivateRoute>
            <AppLayout><Learning /></AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/study/:planId/:chapterId"
        element={
          <PrivateRoute>
            <AppLayout><Study /></AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/user"
        element={
          <PrivateRoute>
            <AppLayout><UserCenter /></AppLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default App
