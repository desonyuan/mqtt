import * as SecureStore from 'expo-secure-store';

// 存储键常量
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER_ROLE: 'user_role',
  FIRST_TIME_USER: 'first_time_user',
};

/**
 * 存储工具类 - 提供安全存储操作的统一接口
 */
class Storage {
  /**
   * 保存数据到安全存储
   * @param key 存储键
   * @param value 存储值
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`存储数据失败 (${key}):`, error);
      throw error;
    }
  }

  /**
   * 从安全存储中获取数据
   * @param key 存储键
   * @returns 存储的值或null（如果不存在）
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`获取数据失败 (${key}):`, error);
      return null;
    }
  }

  /**
   * 从安全存储中删除数据
   * @param key 存储键
   */
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`删除数据失败 (${key}):`, error);
      throw error;
    }
  }

  /**
   * 保存身份验证令牌
   * @param token JWT令牌
   */
  async saveToken(token: string): Promise<void> {
    return this.setItem(STORAGE_KEYS.TOKEN, token);
  }

  /**
   * 获取身份验证令牌
   * @returns JWT令牌或null
   */
  async getToken(): Promise<string | null> {
    return this.getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * 保存用户角色
   * @param role 用户角色
   */
  async saveUserRole(role: 'admin' | 'senior' | 'normal'): Promise<void> {
    return this.setItem(STORAGE_KEYS.USER_ROLE, role);
  }

  /**
   * 获取用户角色
   * @returns 用户角色或null
   */
  async getUserRole(): Promise<string | null> {
    return this.getItem(STORAGE_KEYS.USER_ROLE);
  }

  /**
   * 保存首次使用标志
   * @param isFirstTime 是否首次使用
   */
  async saveFirstTimeUser(isFirstTime: boolean): Promise<void> {
    return this.setItem(STORAGE_KEYS.FIRST_TIME_USER, isFirstTime ? 'true' : 'false');
  }

  /**
   * 获取首次使用标志
   * @returns 是否首次使用（如果标志不存在，默认为true）
   */
  async isFirstTimeUser(): Promise<boolean> {
    const value = await this.getItem(STORAGE_KEYS.FIRST_TIME_USER);
    return value === null || value === 'true';
  }

  /**
   * 清除所有身份验证相关数据
   */
  async clearAuthData(): Promise<void> {
    await Promise.all([
      this.removeItem(STORAGE_KEYS.TOKEN),
      this.removeItem(STORAGE_KEYS.USER_ROLE),
    ]);
  }
}

// 导出单例实例
export const storage = new Storage();

export default storage; 