import axios, { AxiosRequestConfig } from 'axios';
import storage from '@/utils/storage';
import { ApiErrorType, ApiError } from './api';

// API基本URL
const API_BASE_URL = 'https://v4.purcloud.ltd:8899';

// 创建axios实例
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 15000, // 15秒超时
});

// 传感器数据项接口
export interface SensorDataItem {
    data_uuid: string;
    device_uuid: string;
    timestamp: string; // ISO格式的时间戳
    raw_data: any; // 解析后的传感器数据
}

// 分页传感器数据响应接口
export interface SensorDataResponse {
    device_uuid: string;
    device_name?: string | null; // 新增设备名称字段
    raw_data: any[];
    current_page: number;
    total_pages: number;
    total_items: number;
}

// 传感器数据API服务类
class SensorDataApiService {
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
     * 管理员获取所有传感器数据
     * @param page 页码
     * @param pageSize 每页大小
     */
    async getAdminSensorData(page: number = 1, pageSize: number = 10): Promise<SensorDataResponse> {
        return this.request({
            url: '/admin/sensor-data',
            method: 'GET',
            params: { page, page_size: pageSize }
        });
    }

    /**
     * 高级用户获取自己设备的传感器数据
     * @param page 页码
     * @param pageSize 每页大小
     */
    async getSeniorSensorData(page: number = 1, pageSize: number = 10): Promise<SensorDataResponse> {
        return this.request({
            url: '/senior/sensor-data',
            method: 'GET',
            params: { page, page_size: pageSize }
        });
    }

    /**
     * 普通用户获取所属高级用户的设备传感器数据
     * @param page 页码
     * @param pageSize 每页大小
     */
    async getUserSensorData(page: number = 1, pageSize: number = 10): Promise<SensorDataResponse> {
        return this.request({
            url: '/user/sensor-data',
            method: 'GET',
            params: { page, page_size: pageSize }
        });
    }

    /**
     * 查询设备传感器数据
     * @param deviceUuid 设备UUID
     * @param page 页码
     * @param pageSize 每页条数
     */
    async getDeviceSensorData(deviceUuid: string, page: number = 1, pageSize: number = 10): Promise<SensorDataResponse> {
        return this.request({
            url: '/device-sensor-data',
            method: 'GET',
            params: { 
                device_uuid: deviceUuid, 
                page, 
                page_size: pageSize 
            }
        });
    }
}

// 导出单例实例
export const sensorDataApi = new SensorDataApiService();
export default sensorDataApi; 