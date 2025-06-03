import axios, { AxiosRequestConfig } from 'axios';
import storage from '@/utils/storage';
import { ApiErrorType, ApiError } from './api';

// API基本URL
const API_BASE_URL = 'https://v4.purcloud.ltd:8899/api';

// 创建axios实例
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 15000, // 15秒超时
});

// 事件日志项接口
export interface EventLogItem {
    log_uuid: string;
    event_type: string;
    device_uuid: string | null;
    user_uuid: string | null;
    details: string;
    timestamp: string; // ISO格式的时间戳
}

// 分页事件日志响应接口
export interface EventLogsResponse {
    device_name?: string | null; // 新增设备名称字段
    data: EventLogItem[];
    current_page: number;
    total_pages: number;
    total_items: number;
}

// 事件日志API服务类
class EventLogApiService {
    private async request<T>(config: AxiosRequestConfig): Promise<T> {
        try {
            // 获取认证令牌
            const token = await storage.getToken();
            
            // 如果有令牌，添加到请求头
            if (token) {
                config.headers = {
                    ...config.headers,
                    'Authorization': `Bearer ${token}`
                };
            }
            
            // 发送请求
            const response = await api(config);
            return response.data;
        } catch (error: any) {
            console.error('API请求失败:', error);
            
            if (error.response && error.response.data && error.response.data.error) {
                throw { error: error.response.data.error, status: error.response.status };
            }
            
            throw { error: ApiErrorType.INTERNAL_SERVER_ERROR, status: 500 };
        }
    }

    /**
     * 管理员获取所有事件日志
     * @param page 页码
     * @param pageSize 每页大小
     */
    async getAdminEventLogs(page: number = 1, pageSize: number = 10): Promise<EventLogsResponse> {
        return this.request({
            url: '/admin/event-logs',
            method: 'GET',
            params: { page, page_size: pageSize }
        });
    }

    /**
     * 高级用户获取自己设备的事件日志
     * @param page 页码
     * @param pageSize 每页大小
     */
    async getSeniorEventLogs(page: number = 1, pageSize: number = 10): Promise<EventLogsResponse> {
        return this.request({
            url: '/senior/event-logs',
            method: 'GET',
            params: { page, page_size: pageSize }
        });
    }

    /**
     * 普通用户获取所属高级用户的设备事件日志
     * @param page 页码
     * @param pageSize 每页大小
     */
    async getUserEventLogs(page: number = 1, pageSize: number = 10): Promise<EventLogsResponse> {
        return this.request({
            url: '/user/event-logs',
            method: 'GET',
            params: { page, page_size: pageSize }
        });
    }

    /**
     * 查询设备事件日志
     * @param deviceUuid 设备UUID
     * @param eventType 事件类型（可选）
     * @param page 页码
     * @param pageSize 每页条数
     */
    async getDeviceEventLogs(deviceUuid: string, eventType?: string, page: number = 1, pageSize: number = 10): Promise<EventLogsResponse> {
        const params: any = { 
            device_uuid: deviceUuid,
            page, 
            page_size: pageSize 
        };
        
        if (eventType) {
            params.event_type = eventType;
        }
        
        return this.request({
            url: '/device-event-logs',
            method: 'GET',
            params
        });
    }
}

// 导出单例实例
export const eventLogApi = new EventLogApiService();
export default eventLogApi; 