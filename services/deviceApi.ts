import axios, { AxiosRequestConfig } from 'axios';
import storage from '@/utils/storage';

// API基本URL
const API_BASE_URL = 'http://192.168.5.21:8000';

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
    is_online: boolean;
    time: string; // ISO格式的时间戳
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
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    /**
     * 高级用户注册设备
     * @param deviceUuid 设备UUID
     */
    async registerDevice(deviceUuid: string): Promise<{ message: string }> {
        return this.request({
            url: '/device/register',
            method: 'POST',
            data: { device_uuid: deviceUuid }
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
     */
    async adminRegisterDevice(userUuid: string, deviceUuid: string): Promise<{ message: string }> {
        return this.request({
            url: '/device/admin/register',
            method: 'POST',
            data: { user_uuid: userUuid, device_uuid: deviceUuid }
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
     * 高级用户查询自己的主设备
     */
    async getMasterDevices(): Promise<string[]> {
        return this.request({
            url: '/device/master',
            method: 'GET'
        });
    }

    /**
     * 普通用户查询所属高级用户的主设备
     */
    async getSeniorMasterDevices(): Promise<string[]> {
        return this.request({
            url: '/device/senior/master',
            method: 'GET'
        });
    }

    /**
     * 高级用户查询主设备及其从设备
     */
    async getMasterSlavesRelation(): Promise<MasterSlaveRelation[]> {
        return this.request({
            url: '/device/master/slaves',
            method: 'GET'
        });
    }

    /**
     * 普通用户查询所属高级用户的主设备及其从设备
     */
    async getSeniorMasterSlavesRelation(): Promise<MasterSlaveRelation[]> {
        return this.request({
            url: '/device/senior/master/slaves',
            method: 'GET'
        });
    }

    /**
     * 高级用户查询在线主设备
     */
    async getOnlineMasterDevices(): Promise<DeviceOnlineStatus[]> {
        return this.request({
            url: '/device/master/online',
            method: 'GET'
        });
    }

    /**
     * 管理员查询指定高级用户的在线设备
     * @param seniorUuid 高级用户UUID
     */
    async getOnlineDevicesForSenior(seniorUuid: string): Promise<DeviceOnlineStatus[]> {
        return this.request({
            url: '/device/admin/devices/online',
            method: 'GET',
            params: { senior_uuid: seniorUuid }
        });
    }

    /**
     * 管理员分页查询所有设备
     * @param page 页码
     * @param pageSize 每页大小
     */
    async getAllDevices(page: number = 1, pageSize: number = 10): Promise<any> {
        return this.request({
            url: '/device/admin/devices',
            method: 'GET',
            params: { page, page_size: pageSize }
        });
    }
}

// 导出单例实例
export const deviceApi = new DeviceApiService();
export default deviceApi; 