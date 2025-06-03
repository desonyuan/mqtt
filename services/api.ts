import axios, {AxiosRequestConfig} from 'axios';
import * as crypto from 'expo-crypto';
import {jwtDecode} from 'jwt-decode';
import storage from '@/utils/storage';

// API基本URL
const API_BASE_URL = 'https://v4.purcloud.ltd:8899';

// API错误类型枚举
export enum ApiErrorType {
  NOT_FOUND = 'not_found', // 资源未找到
  AUTHENTICATION_FAILED = 'authentication_failed', // 认证失败
  INVALID_TOKEN = 'invalid_token', // 无效的JWT令牌
  TOKEN_EXPIRED = 'token_expired', // JWT令牌已过期
  FORBIDDEN = 'forbidden', // 权限不足
  VALIDATION_ERROR = 'validation_error', // 输入验证失败
  CAPTCHA_ERROR = 'captcha_error', // 验证码错误
  INVALID_JSON = 'invalid_json', // JSON格式无效
  INVALID_FORM = 'invalid_form', // 表单无效
  INVALID_PATH = 'invalid_path', // 路径参数无效
  INVALID_QUERY = 'invalid_query', // 查询参数无效
  INVALID_REQUEST = 'invalid_request', // 请求无效
  DATABASE_ERROR = 'database_error', // 数据库错误
  USERNAME_EXISTS = 'username_exists', // 用户名已存在
  INVALID_USER_TYPE = 'invalid_user_type', // 用户类型无效
  UNIQUE_VIOLATION = 'unique_violation', // 唯一约束冲突
  DEVICE_UNREGISTER_FAILED = 'device_unregister_failed', // 设备注销失败
  REDIS_TIMEOUT = 'redis_timeout', // Redis超时
  REDIS_CONNECTION_ERROR = 'redis_connection_error', // Redis连接错误
  REDIS_IO_ERROR = 'redis_io_error', // Redis IO错误
  REDIS_ERROR = 'redis_error', // Redis通用错误
  INTERNAL_SERVER_ERROR = 'internal_server_error', // 服务器内部错误
}

// API错误接口
export interface ApiError {
  error: ApiErrorType;
}

// 创建axios实例
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000, // 15秒超时
  withCredentials: false,
});

// 请求拦截器
api.interceptors.request.use(
  async (config) => {
    // 获取JWT令牌
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.log(error.response, '请求错误');
    return Promise.reject(error?.response);
  }
);

// JWT载荷接口
export interface JwtPayload {
  exp: number;
  iat: number;
  sub: string | JwtSubject; // JwtSubject的JSON字符串或对象
}

// 后端JwtSubject结构
export interface JwtSubject {
  user_uuid: string;
  user_type: string;
}

// 认证响应接口
export interface AuthResponse {
  token: string;
  message: string;
}

// 登录请求接口
export interface LoginRequest {
  username: string;
  password_hash: string;
  captcha_id: string;
  captcha_code: string;
}

// 注册请求接口 - 高级用户
export interface RegisterRequest {
  username: string;
  password_hash: string;
  captcha_id: string;
  captcha_code: string;
}

// 注册请求接口 - 普通用户
export interface RegisterRequestNormal {
  username: string;
  password_hash: string;
  captcha_id: string;
  captcha_code: string;
  manager_username: string;
}

// 传感器数据接口
export interface SensorData {
  timestamp: number;
  temperature: number;
  humidity: number;
  pressure: number;
  co2: number;
  tvoc: number;
}

// 验证码响应接口
export interface CaptchaResponse {
  captcha_id: string;
  captcha_image: string;
  message: string;
}

// 用户信息接口
export interface User {
  user_uuid: string;
  username: string;
  user_type: string;
}

// 分页用户响应接口
export interface UsersResponse {
  users: User[];
  total_pages: number;
  current_page: number;
}

// 邀请码信息接口
export interface InviteCode {
  code: string;
  senior_uuid: string;
  expires_in: number;
}

// 分页邀请码响应接口
export interface InviteCodesResponse {
  invite_codes: InviteCode[];
  total_pages: number;
  current_page: number;
}

// WebSocket连接状态
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

// 解析JWT令牌
export const decodeJwt = (token: string): {payload: JwtPayload; subject: JwtSubject} => {
  try {
    // 使用jwt-decode库解析令牌
    const payload = jwtDecode<JwtPayload>(token);

    // 解析sub字段（可能是JSON字符串或已解析的对象）
    let subject: JwtSubject;

    if (typeof payload.sub === 'string') {
      try {
        subject = JSON.parse(payload.sub);
      } catch (e) {
        throw new Error('无法解析JWT subject字段');
      }
    } else {
      subject = payload.sub as JwtSubject;
    }

    return {payload, subject};
  } catch (error) {
    console.error('JWT解析失败:', error);
    throw error;
  }
};

// 从用户类型到角色的映射
export const mapUserTypeToRole = (userType: string): 'admin' | 'senior' | 'normal' => {
  switch (userType.toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'senior':
      return 'senior';
    default:
      return 'normal';
  }
};

// 使用用户名作为盐值进行密码加密
export const hashPassword = async (username: string, password: string): Promise<string> => {
  try {
    // 使用用户名作为盐值
    const salt = await crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA1, username);

    // 将密码和盐值结合
    const passwordWithSalt = `${password}:${salt}`;

    // 使用SHA-512进行哈希
    const hash = await crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA512, passwordWithSalt);

    // 返回哈希结果（不需要存储盐值，因为就是用户名）
    return hash;
  } catch (error) {
    console.error('密码加密失败:', error);
    throw error;
  }
};

// 密码验证函数
export const verifyPassword = async (username: string, password: string, storedHash: string): Promise<boolean> => {
  try {
    // 使用用户名作为盐值重新计算哈希
    const passwordWithSalt = `${password}:${username}`;
    const verifyHash = await crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA512, passwordWithSalt);

    // 比较两个哈希值
    return verifyHash === storedHash;
  } catch (error) {
    console.error('密码验证失败:', error);
    return false;
  }
};


// 创建API客户端类，集中处理认证逻辑
class ApiClient {
  // 发送请求时自动添加认证头
  private async request<T>(config: AxiosRequestConfig, requiresAuth: boolean = true): Promise<T> {
    if (requiresAuth) {
      // 检查当前是否有认证头
      if (!api.defaults.headers.common['Authorization']) {
        const token = await storage.getToken();
        if (!token) {
          throw new Error('用户未登录，需要认证才能访问此接口');
        }
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await api(config);
      return response.data;
    } catch (error) {
      // 错误处理
      console.error(`API请求失败: ${config.url}`, error);
      // 如果是401错误，可能是token过期，清除token
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        delete api.defaults.headers.common['Authorization'];
        // 可以在这里添加自动重新登录或跳转到登录页的逻辑
        throw new Error('认证失败，请重新登录');
      }
      throw error;
    }
  }

  // 设置认证令牌
  setAuthToken(token: string | null): void {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }

  // 获取欢迎消息
  async getHello(): Promise<string> {
    return this.request({url: '/', method: 'GET'});
  }

  // 获取验证码 (不需要认证)
  async getCaptcha(): Promise<CaptchaResponse> {
    return this.request({url: '/captcha', method: 'GET'}, false);
  }

  // 登录 (不需要认证)
  async login(username: string, password: string, captchaId: string, captchaCode: string): Promise<AuthResponse> {
    const password_hash = await hashPassword(username, password);
    console.log('username: ' + username);
    console.log('password_hash: ' + password_hash);
    return this.request(
      {
        url: '/login',
        method: 'POST',
        data: {
          username,
          password_hash,
          captcha_id: captchaId,
          captcha_code: captchaCode,
        },
      },
      false
    );
  }

  // 注册 - 管理员 (不需要认证)
  async registerAdmin(
    username: string,
    password: string,
    captchaId: string,
    captchaCode: string
  ): Promise<AuthResponse> {
    const password_hash = await hashPassword(username, password);
    return this.request(
      {
        url: '/register/admin',
        method: 'POST',
        data: {
          username,
          password_hash,
          captcha_id: captchaId,
          captcha_code: captchaCode,
        },
      },
      false
    );
  }

  // 注册 - 高级用户 (不需要认证)
  async registerSenior(
    username: string,
    password: string,
    captchaId: string,
    captchaCode: string
  ): Promise<AuthResponse> {
    const password_hash = await hashPassword(username, password);
    return this.request(
      {
        url: '/register/senior',
        method: 'POST',
        data: {
          username,
          password_hash,
          captcha_id: captchaId,
          captcha_code: captchaCode,
        },
      },
      false
    );
  }

  // 注册 - 普通用户 (不需要认证)
  async registerNormal(
    username: string,
    password: string,
    captchaId: string,
    captchaCode: string
  ): Promise<AuthResponse> {
    const password_hash = await hashPassword(username, password);
    return this.request(
      {
        url: '/register/normal',
        method: 'POST',
        data: {
          username,
          password_hash,
          captcha_id: captchaId,
          captcha_code: captchaCode,
        },
      },
      false
    );
  }

  // 修改密码 (需要认证)
  async changePassword(oldPassword: string, newPassword: string): Promise<{message: string}> {
    const token = await storage.getToken();
    if (!token) {
      throw new Error('用户未登录');
    }

    // 解析token获取用户信息
    //const { subject } = decodeJwt(token);
    const username = await this.getHello();

    // 计算密码哈希
    const old_password_hash = await hashPassword(username, oldPassword);
    const new_password_hash = await hashPassword(username, newPassword);

    return this.request({
      url: '/password/change',
      method: 'POST',
      data: {
        old_password_hash,
        new_password_hash,
      },
    });
  }

  // 管理员重置用户密码 (需要管理员认证)
  async resetPassword(targetUserUuid: string, newPassword: string): Promise<{message: string}> {
    const user = await this.getUserByUseruuid(targetUserUuid);
    const new_password_hash = await hashPassword(user.username, newPassword);

    return this.request({
      url: '/password/reset',
      method: 'POST',
      data: {
        target_user_uuid: targetUserUuid,
        new_password_hash,
      },
    });
  }

  // 用户注销自己的账号 (需要认证)
  async deleteAccount(password: string): Promise<{message: string}> {
    const token = await storage.getToken();
    if (!token) {
      throw new Error('用户未登录');
    }

    const {subject} = decodeJwt(token);
    const username = subject.user_uuid;
    const password_hash = await hashPassword(username, password);

    return this.request({
      url: '/account/delete',
      method: 'DELETE',
      data: {password_hash},
    });
  }

  // 管理员强制注销指定用户账号 (需要管理员认证)
  async adminDeleteAccount(targetUserUuid: string): Promise<{message: string}> {
    return this.request({
      url: '/account/admin/delete',
      method: 'DELETE',
      data: {target_user_uuid: targetUserUuid},
    });
  }

  // 高级用户移除普通用户 (需要高级用户认证)
  async seniorRemoveNormalUser(normalUserUuid: string): Promise<{message: string}> {
    return this.request({
      url: '/account/senior/remove',
      method: 'POST',
      data: {normal_user_uuid: normalUserUuid},
    });
  }

  // 生成邀请码 (需要高级用户认证)
  async generateInviteCode(): Promise<{invite_code: string; message: string}> {
    return this.request({
      url: '/invite/generate',
      method: 'GET',
    });
  }

  // 使用邀请码 (需要普通用户认证)
  async useInviteCode(inviteCode: string): Promise<{invite_code: string; message: string}> {
    return this.request({
      url: '/invite/use',
      method: 'POST',
      data: {invite_code: inviteCode},
    });
  }

  // 管理员分页查询用户 (需要管理员认证)
  async getUsers(page: number = 1, pageSize: number = 10, search?: string): Promise<UsersResponse> {
    let url = `/admin/users?page=${page}&page_size=${pageSize}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    return this.request({
      url,
      method: 'GET',
    });
  }

  // 管理员修改用户信息 (需要管理员认证)
  async updateUser(
    userUuid: string,
    updates: {
      username?: string;
      password_hash?: string;
      user_type?: string;
      manager_uuid?: string;
    }
  ): Promise<{message: string}> {
    // 确保所有未填写的字段都显式设置为null
    const payload = {
      user_uuid: userUuid,
      password_hash: updates.password_hash ?? null,
      user_type: updates.user_type ?? null,
      manager_uuid: updates.manager_uuid ?? null,
    };

    console.log('payload: ' + JSON.stringify(payload));
    return this.request({
      url: '/admin/users',
      method: 'PUT',
      data: payload,
    });
  }

  // 新增用户 (需要管理员认证)
  async addUser(userData: any): Promise<{message: string}> {
    const {username, password, user_type, manager_uuid} = userData;
    const password_hash = await hashPassword(username, password);
    console.log({
      user_uuid: '', // 空UUID表示新增用户
      username,
      password_hash,
      user_type,
      manager_uuid,
    });

    return this.request({
      url: '/admin/users',
      method: 'PUT',
      data: {
        user_uuid: '', // 空UUID表示新增用户
        username,
        password_hash,
        user_type,
        manager_uuid,
      },
    });
  }

  // 管理员删除用户 (需要管理员认证)
  async deleteUser(userUuid: string): Promise<{message: string}> {
    return this.request({
      url: '/admin/users',
      method: 'DELETE',
      data: {user_uuid: userUuid},
    });
  }

  // 管理员批量删除用户 (需要管理员认证)
  async deleteUsersBatch(userUuids: string[]): Promise<{deleted_count: number; message: string}> {
    return this.request({
      url: '/admin/users/batch',
      method: 'DELETE',
      data: {user_uuids: userUuids},
    });
  }

  // 管理员根据用户名查询用户 (需要管理员认证)
  async getUserByUsername(username: string): Promise<User> {
    return this.request({
      url: '/admin/users/username',
      method: 'POST',
      data: {username},
    });
  }
  // 管理员根据用户名查询用户 (需要管理员认证)
  async getUserByUseruuid(userUuid: string): Promise<User> {
    return this.request({
      url: '/admin/users/useruuid',
      method: 'POST',
      data: {user_uuid: userUuid},
    });
  }

  // 管理员分页查询邀请码 (需要管理员认证)
  async getInviteCodes(page: number = 1, pageSize: number = 10): Promise<InviteCodesResponse> {
    return this.request({
      url: `/admin/invite-codes?page=${page}&page_size=${pageSize}`,
      method: 'GET',
    });
  }

  // 管理员批量删除邀请码 (需要管理员认证)
  async deleteInviteCodesBatch(inviteCodes: string[]): Promise<{deleted_count: number; message: string}> {
    return this.request({
      url: '/admin/invite-codes/batch',
      method: 'DELETE',
      data: {invite_codes: inviteCodes},
    });
  }
}

// 创建单例实例
export const apiService = new ApiClient();
export default apiService;
