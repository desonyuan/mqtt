import axios, { AxiosRequestConfig } from 'axios';
import storage from '@/utils/storage';
import { Buffer } from 'buffer';

// API基本URL
const API_BASE_URL = 'https://v4.purcloud.ltd:8899';

/**
 * MQTT API服务类
 */
class MqttApiService {
  /**
   * 发送请求到后端API
   * @param config Axios请求配置
   * @returns 响应数据
   */
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      // 获取认证令牌
      const token = await storage.getToken();
      
      // 如果有令牌，设置认证头
      if (token) {
        if (!config.headers) {
          config.headers = {};
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // 添加API基本URL
      config.baseURL = API_BASE_URL;
      
      // 发送请求
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      // 处理错误
      if (error.response) {
        // 服务器响应错误
        console.error('API错误:', error.response.status, error.response.data);
        throw error.response.data;
      } else if (error.request) {
        // 请求未收到响应
        console.error('API请求未收到响应:', error.request);
        throw new Error('网络错误，请检查您的网络连接');
      } else {
        // 请求设置时出错
        console.error('API请求错误:', error.message);
        throw new Error(`请求错误: ${error.message}`);
      }
    }
  }

  /**
   * 发布MQTT消息
   * @param topic 发布的MQTT主题
   * @param deviceUuid 设备唯一标识符（与config二选一）
   * @param config Base64编码的protobuf配置数据（与deviceUuid二选一）
   * @returns 操作结果
   */
  async publishMqttMessage(topic: string, deviceUuid?: string, config?: string): Promise<{ message: string }> {
    // 检查参数
    if (!deviceUuid && !config) {
      throw new Error("必须提供device_uuid或config参数中的一个");
    }
    
    if (deviceUuid && config) {
      throw new Error("不能同时提供device_uuid和config参数");
    }
    
    // 准备请求数据
    const requestData: any = { topic };
    
    if (deviceUuid) {
      requestData.device_uuid = deviceUuid;
    }
    
    if (config) {
      requestData.config = config;
    }
    
    // 调用API
    return this.request({
      url: '/mqtt/publish',
      method: 'POST',
      data: requestData
    });
  }
}
// 导出单例实例
const mqttApiService = new MqttApiService();
export default mqttApiService; 