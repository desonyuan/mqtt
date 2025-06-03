import axios, {AxiosRequestConfig} from 'axios';
import * as crypto from 'expo-crypto';
import {jwtDecode} from 'jwt-decode';
import storage from '@/utils/storage';

// API基本URL
const API_BASE_URL = 'https://v4.purcloud.ltd:8899';
const WS_BASE_URL = 'ws://192.168.5.21:8000';

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

// WebSocket管理类
export class SensorWebSocketManager {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private status: WebSocketStatus = 'disconnected';
  private pingInterval: NodeJS.Timeout | null = null;
  //private reconnectAttempts = 0;
  //private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onMessageCallback: ((data: SensorData) => void) | null = null;
  private onStatusChangeCallback: ((status: WebSocketStatus) => void) | null = null;
  private autoReconnect: boolean = true; // 是否允许自动重连
  private isActive: boolean = false; // 标记WebSocket是否处于活跃状态

  constructor() {
    this.setupEventHandlers = this.setupEventHandlers.bind(this);
  }

  // 设置状态变更回调
  public setOnStatusChange(callback: (status: WebSocketStatus) => void): void {
    this.onStatusChangeCallback = callback;
  }

  // 设置消息回调
  public setOnMessage(callback: (data: SensorData) => void): void {
    this.onMessageCallback = callback;
  }

  // 更新状态并触发回调
  private updateStatus(newStatus: WebSocketStatus): void {
    this.status = newStatus;

    // 只有在WebSocket活跃时才触发回调
    if (this.isActive && this.onStatusChangeCallback) {
      this.onStatusChangeCallback(newStatus);
    }
  }

  // 设置认证令牌
  public setToken(token: string | null): void {
    this.token = token;
  }

  // 设置是否允许自动重连
  public setAutoReconnect(enable: boolean): void {
    this.autoReconnect = enable;
    console.log(`WebSocket自动重连已${enable ? '启用' : '禁用'}`);
  }

  // 连接WebSocket
  public connect(): void {
    // 标记WebSocket为活跃状态
    this.isActive = true;

    // 启用自动重连
    this.autoReconnect = true;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.updateStatus('connecting');
      if (!this.token) {
        throw new Error('连接WebSocket需要认证令牌');
      }

      // 创建一个使用Sec-WebSocket-Protocol传递token的WebSocket连接
      // 这样后端可以从WebSocket协议头中获取token进行认证
      const wsUrl = `${WS_BASE_URL}/api/ws/devices`;

      // 使用自定义WebSocket协议，将token作为协议名传递
      // 注意：此处需要传递一个协议数组，第一个元素是token
      this.ws = new WebSocket(wsUrl, [`Bearer.${this.token}`]);

      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket连接失败:', error);
      this.updateStatus('error');
      if (this.autoReconnect && this.isActive) {
        this.attemptReconnect();
      }
    }
  }

  // 设置WebSocket事件处理
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      if (!this.isActive) {
        console.log('WebSocket已打开，但已标记为非活跃，即将关闭');
        this.disconnect();
        return;
      }

      console.log('WebSocket连接已建立');
      this.updateStatus('connected');
      //this.reconnectAttempts = 0;
      this.startPingInterval();
    };

    this.ws.onmessage = (event) => {
      // 如果WebSocket已经不活跃，不处理任何消息
      if (!this.isActive) {
        console.log('WebSocket已标记为非活跃，忽略收到的消息');
        return;
      }

      try {
        const data = JSON.parse(event.data) as SensorData;
        if (this.onMessageCallback) {
          this.onMessageCallback(data);
        }
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket连接已关闭');
      this.updateStatus('disconnected');
      this.stopPingInterval();

      // 只有在活跃且允许自动重连的情况下才尝试重连
      //if (this.autoReconnect && this.isActive) {
      if (this.autoReconnect && this.isActive) {
        this.attemptReconnect();
      } else {
        console.log('WebSocket不会自动重连: 自动重连=' + this.autoReconnect + ', 活跃状态=' + this.isActive);
      }
    };

    // this.ws.onerror = (error) => {
    //     console.error('WebSocket错误:', error);
    //     this.updateStatus('error');
    // };
  }

  // 发送ping消息保持连接
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      // 只在WebSocket活跃时发送ping
      if (this.isActive) {
        this.sendPing();
      } else {
        this.stopPingInterval();
      }
    }, 30000); // 每30秒发送一次ping
  }

  // 停止ping间隔
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // 发送ping消息
  private sendPing(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isActive) {
      this.ws.send('ping');
    }
  }

  // 尝试重新连接
  private attemptReconnect(): void {
    // 如果WebSocket不活跃或不允许自动重连，直接返回
    if (!this.isActive || !this.autoReconnect) {
      console.log('不会尝试重连: 自动重连=' + this.autoReconnect + ', 活跃状态=' + this.isActive);
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // if (this.reconnectAttempts >= this.maxReconnectAttempts) {
    //     console.log('达到最大重连次数，停止重连');
    //     this.updateStatus('error');
    //     return;
    // }

    //this.reconnectAttempts++;
    this.updateStatus('reconnecting');

    // 使用指数退避策略
    //const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    //console.log(`将在${delay}ms后尝试重新连接 (尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      // 重连前再次检查活跃状态和自动重连设置
      if (this.isActive && this.autoReconnect) {
        this.connect();
      } else {
        console.log('重连已取消: 自动重连=' + this.autoReconnect + ', 活跃状态=' + this.isActive);
      }
    }, 10);
  }

  // 关闭连接
  public disconnect(): void {
    console.log('断开WebSocket连接');

    // 标记为非活跃状态
    this.isActive = false; // <-- 新增此行
    // 停止定时器
    this.stopPingInterval();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // 断开连接
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        console.error('关闭WebSocket时发生错误:', e);
      }
      this.ws = null;
    }

    this.status = 'disconnected';
  }

  // 获取当前连接状态
  public getStatus(): WebSocketStatus {
    return this.status;
  }
}

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

// 创建WebSocket管理器实例
export const sensorWebSocketManager = new SensorWebSocketManager();

export default apiService;
