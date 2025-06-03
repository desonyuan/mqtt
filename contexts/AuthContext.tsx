import React, {createContext, useState, useContext, useEffect} from 'react';
import storage, {STORAGE_KEYS} from '@/utils/storage';
import apiAuth from '@/utils/apiAuth';

// 定义认证上下文类型
interface AuthContextType {
  isLoading: boolean;
  isLoggedIn: boolean;
  token: string | null;
  authToken: string | null;
  userRole: 'admin' | 'senior' | 'normal' | null;
  firstTimeUser: boolean;
  login: (token: string, role: 'admin' | 'senior' | 'normal') => Promise<void>;
  logout: () => Promise<void>;
  markAsReturningUser: () => Promise<void>;
  resetFirstTimeUser: () => Promise<void>;
}

// 创建上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 提供程序组件
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'senior' | 'normal' | null>(null);
  const [firstTimeUser, setFirstTimeUser] = useState(true);

  // 初始化 - 从安全存储中加载认证状态
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        // 并行加载所有数据
        const [storedToken, storedRole, isFirstTime] = await Promise.all([
          storage.getToken(),
          storage.getUserRole(),
          storage.isFirstTimeUser(),
        ]);

        // 如果有token，设置token和角色
        if (storedToken) {
          setToken(storedToken);
          if (storedRole) {
            setUserRole(storedRole as 'admin' | 'senior' | 'normal');
          }
        }

        // 处理首次用户状态
        setFirstTimeUser(isFirstTime);
      } catch (error) {
        console.error('加载认证状态失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  // 登录
  const login = async (newToken: string, role: 'admin' | 'senior' | 'normal') => {
    try {
      // 使用apiAuth工具设置授权
      await apiAuth.setAuth(newToken, role);
      // 更新状态
      setToken(newToken);
      setUserRole(role);
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  // 登出
  const logout = async () => {
    try {
      // 使用apiAuth工具清除授权
      await apiAuth.clearAuth();

      // 更新状态
      setToken(null);
      setUserRole(null);
    } catch (error) {
      console.error('登出失败:', error);
      throw error;
    }
  };

  // 标记为非首次用户（不再显示欢迎页面）
  const markAsReturningUser = async () => {
    try {
      await storage.saveFirstTimeUser(false);
      setFirstTimeUser(false);
    } catch (error) {
      console.error('标记为非首次用户失败:', error);
      throw error;
    }
  };

  // 重置为首次用户状态（用于测试）
  const resetFirstTimeUser = async () => {
    try {
      await storage.removeItem(STORAGE_KEYS.FIRST_TIME_USER);
      setFirstTimeUser(true);
    } catch (error) {
      console.error('重置首次用户状态失败:', error);
      throw error;
    }
  };

  // 提供上下文值
  const value: AuthContextType = {
    isLoading,
    isLoggedIn: !!token,
    token,
    authToken: token,
    userRole,
    firstTimeUser,
    login,
    logout,
    markAsReturningUser,
    resetFirstTimeUser,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 自定义钩子以便于使用上下文
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
