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

// 设备在线状态接口
export interface DeviceOnlineStatus {
    device_uuid: string;
    device_name?: string | null; // 设备名称字段
    is_online: boolean;
    time: string; // ISO格式的时间戳
    owner_uuid: string;
}

// 设备详细信息接口
export interface DeviceDetailInfo {
    device_uuid: string;
    device_name?: string | null; // 新增设备名称字段
    device_type: number;
    master_uuid: string | null;
    owner_uuid: string;
    is_online: boolean;
    time: string;
}

// 主从设备关系接口
export interface MasterSlaveRelation {
    device_uuid: string;
    slave_device_uuid: string[];
}

// 设备API服务类
class DeviceApiService {
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
     * 高级用户注册设备
     * @param deviceUuid 设备UUID
     * @param deviceName 可选的设备名称
     */
    async registerDevice(deviceUuid: string, deviceName?: string): Promise<{ message: string }> {
        return this.request({
            url: '/device/register',
            method: 'POST',
            data: { 
                device_uuid: deviceUuid,
                device_name: deviceName
            }
        });
    }

    /**
     * 高级用户注销设备
     * @param deviceUuid 设备UUID
     */
    async unregisterDevice(deviceUuid: string): Promise<{ message: string }> {
        return this.request({
            url: '/device/unregister',
            method: 'DELETE',
            data: { device_uuid: deviceUuid }
        });
    }

    /**
     * 管理员为高级用户注册设备
     * @param userUuid 高级用户UUID
     * @param deviceUuid 设备UUID
     * @param deviceName 可选的设备名称
     */
    async adminRegisterDevice(userUuid: string, deviceUuid: string, deviceName?: string): Promise<{ message: string }> {
        return this.request({
            url: '/device/admin/register',
            method: 'POST',
            data: { 
                user_uuid: userUuid, 
                device_uuid: deviceUuid,
                device_name: deviceName
            }
        });
    }

    /**
     * 管理员为高级用户注销设备
     * @param userUuid 高级用户UUID
     * @param deviceUuid 设备UUID
     */
    async adminUnregisterDevice(userUuid: string, deviceUuid: string): Promise<{ message: string }> {
        return this.request({
            url: '/device/admin/unregister',
            method: 'DELETE',
            data: { user_uuid: userUuid, device_uuid: deviceUuid }
        });
    }

    /**
     * 查询在线设备
     * @param searchQuery 可选，管理员用于按高级用户UUID过滤的查询参数
     */
    async getOnlineDevices(searchQuery?: string): Promise<DeviceOnlineStatus[]> {
        return this.request({
            url: '/device',
            method: 'GET',
            params: searchQuery ? { search_query: searchQuery } : undefined
        });
    }

    /**
     * 查询主从设备
     * @param page 页码
     * @param pageSize 每页条数
     * @param searchQuery 设备UUID模糊查询
     */
    async getAllDevices(page: number = 1, pageSize: number = 10, searchQuery?: string): Promise<DeviceDetailInfo[]> {
        return this.request({
            url: '/device/all_devices',
            method: 'GET',
            params: { 
                page, 
                page_size: pageSize,
                search_query: searchQuery
            }
        });
    }

    /**
     * 设备UUID模糊查询
     * @param deviceUuidPattern 设备ID模糊匹配模式
     * @param page 页码
     * @param pageSize 每页条数
     */
    async searchDevices(deviceUuidPattern: string, page: number = 1, pageSize: number = 10): Promise<DeviceDetailInfo[]> {
        return this.request({
            url: '/device/search',
            method: 'GET',
            params: { 
                device_uuid_pattern: deviceUuidPattern,
                page, 
                page_size: pageSize
            }
        });
    }

    /**
     * 管理员查询指定高级用户的设备
     * @param seniorUuid 高级用户UUID
     */
    async getDevicesForSenior(seniorUuid: string): Promise<DeviceDetailInfo[]> {
        return this.request({
            url: '/device/admin/devices',
            method: 'GET',
            params: { senior_uuid: seniorUuid }
        });
    }

    /**
     * 高级用户查询主从关系
     */
    async getMasterSlavesRelation(): Promise<MasterSlaveRelation[]> {
        return this.request({
            url: '/device/master/slaves',
            method: 'GET'
        });
    }

    /**
     * 普通用户查询所属高级用户的主从关系
     */
    async getSeniorMasterSlavesRelation(): Promise<MasterSlaveRelation[]> {
        return this.request({
            url: '/device/senior/master/slaves',
            method: 'GET'
        });
    }
}

// 导出单例实例
export const deviceApi = new DeviceApiService();
export default deviceApi; 