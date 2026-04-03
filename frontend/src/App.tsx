import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { Layout } from 'antd'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Materials from './pages/Materials'
import Learning from './pages/Learning'
import Study from './pages/Study'
import UserCenter from './pages/UserCenter'

const { Content } = Layout

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <Layout className="app-container">
      <Content className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Navigate to="/home" />} />
          <Route
            path="/home"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path="/materials"
            element={
              <PrivateRoute>
                <Materials />
              </PrivateRoute>
            }
          />
          <Route
            path="/learning/:planId"
            element={
              <PrivateRoute>
                <Learning />
              </PrivateRoute>
            }
          />
          <Route
            path="/study/:planId/:chapterId"
            element={
              <PrivateRoute>
                <Study />
              </PrivateRoute>
            }
          />
          <Route
            path="/user"
            element={
              <PrivateRoute>
                <UserCenter />
              </PrivateRoute>
            }
          />
        </Routes>
      </Content>
    </Layout>
  )
}

export default App