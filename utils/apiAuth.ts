import storage from './storage';
import apiService from '@/services/api';

/**
 * API授权工具 - 管理API请求的授权令牌
 */
class ApiAuth {
  /**
   * 初始化授权状态
   * 从存储中加载令牌并设置到API服务
   */
  async initialize(): Promise<void> {
    try {
      const token = await storage.getToken();
      if (token) {
        this.setAuthToken(token);
      }
    } catch (error) {
      console.error('初始化API授权失败:', error);
    }
  }

  /**
   * 设置授权令牌
   * @param token JWT令牌
   */
  setAuthToken(token: string | null): void {
    apiService.setAuthToken(token);
  }

  /**
   * 在用户登录后设置授权
   * @param token JWT令牌
   * @param role 用户角色
   */
  async setAuth(token: string, role: 'admin' | 'senior' | 'normal'): Promise<void> {
    try {
      // 保存令牌和角色到存储
      await Promise.all([
        storage.saveToken(token),
        storage.saveUserRole(role),
      ]);
      
      // 设置API服务的授权头
      this.setAuthToken(token);
    } catch (error) {
      console.error('设置API授权失败:', error);
      throw error;
    }
  }

  /**
   * 清除授权
   */
  async clearAuth(): Promise<void> {
    try {
      // 清除存储中的授权数据
      await storage.clearAuthData();
      
      // 移除API服务的授权头
      this.setAuthToken(null);
    } catch (error) {
      console.error('清除API授权失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const apiAuth = new ApiAuth();

export default apiAuth; 