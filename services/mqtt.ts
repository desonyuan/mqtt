import {createMqttClient, MqttConfig} from '@d11/react-native-mqtt';
import {MqttClient} from '@d11/react-native-mqtt/dist/Mqtt/MqttClient';
import {fromBinary, toBinary} from '@bufbuild/protobuf';
import {type DataPayload, DataPayloadSchema} from '@/proto/data_payload_pb';
import {type ConfigPayload, ConfigPayloadSchema} from '@/proto/config_payload_pb';
import {Buffer} from 'buffer';
import storage from '@/utils/storage';
import mqttApiService from './mqttApi';

// MQTT服务器配置
const MQTT_CONFIG = {
  host: 'v4.purcloud.ltd',
  port: 18883,
  path: '/mqtt',
};

// MQTT QoS级别
enum MqttQos {
  AT_MOST_ONCE = 0,
  AT_LEAST_ONCE = 1,
  EXACTLY_ONCE = 2,
}

// MQTT事件类型
enum MQTT_EVENTS {
  CONNECTED_EVENT = 'connected',
  DISCONNECTED_EVENT = 'disconnected',
  SUBSCRIPTION_EVENT = 'subscription_event',
  SUBSCRIPTION_SUCCESS_EVENT = 'subscribe_success',
  SUBSCRIPTION_FAILED_EVENT = 'subscribe_failed',
  ERROR_EVENT = 'error',
}

// 设备数据主题格式
const DATA_TOPIC_FORMAT = 'data/{device_uuid}';
// 设备配置下发主题格式
const CONFIG_DOWN_TOPIC_FORMAT = 'config/publish/{device_uuid}';
// 设备配置上传主题格式
const CONFIG_UP_TOPIC_FORMAT = 'config/subscribe/{device_uuid}';

// 回调函数类型
export type OnMessageCallback = (topic: string, payload: string) => void;
export type OnConnectCallback = () => void;
export type OnErrorCallback = (error: Error) => void;

/**
 * Base64字符串转Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Uint8Array转Base64字符串
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/**
 * MQTT客户端管理类
 */
class MqttService {
  private client: MqttClient | null = null;
  private messageCallbacks: Map<string, OnMessageCallback> = new Map();
  private connectCallbacks: OnConnectCallback[] = [];
  private errorCallbacks: OnErrorCallback[] = [];
  private isConnected: boolean = false;
  private reconnectTimerId: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, OnMessageCallback> = new Map();
  constructor() {
    this.connect();
  }
  /**
   * 初始化MQTT连接
   */
  async connect(): Promise<void> {
    // 如果已经连接，则返回
    if (this.client && this.isConnected) {
      return;
    }

    // 如果有尝试重连定时器，则清除
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }

    try {
      // 获取认证令牌
      const token = await storage.getToken();

      // 创建客户端配置
      const mqttConfig: MqttConfig = {
        clientId: `react_native_client_${Math.random().toString(16).substring(2, 10)}`,
        host: MQTT_CONFIG.host,
        port: MQTT_CONFIG.port,
        options: {
          username: token ? 'token' : '',
          password: token || '',
          keepAlive: 30,
          cleanSession: true,
          autoReconnect: true,
          maxBackoffTime: 60,
          retryCount: 3,
          jitter: 1,
          enableSslConfig: false,
        },
      };

      console.log(`正在连接MQTT服务器: ${mqttConfig.host}:${mqttConfig.port}`);

      // 创建MQTT客户端
      const newClient = await createMqttClient(mqttConfig);
      console.log('创建MQTT客户端成功');

      // const newClient = await clientPromise;

      if (!newClient) {
        throw new Error('无法创建MQTT客户端');
      }

      this.client = newClient;

      // 设置连接回调
      newClient.setOnConnectCallback((ack) => {
        console.log('已连接到MQTT服务器', ack);
        this.isConnected = true;
        this.resubscribe();
        this.connectCallbacks.forEach((callback) => callback());
      });

      // 设置连接失败回调
      newClient.setOnConnectFailureCallback((error) => {
        console.error('MQTT连接失败:', error);
        this.isConnected = false;
        this.attemptReconnect();
      });

      // 设置错误回调
      newClient.setOnErrorCallback((error) => {
        console.error('MQTT错误:', error);
        this.errorCallbacks.forEach((callback) => callback(new Error(JSON.stringify(error))));
      });

      // 设置断开连接回调
      newClient.setOnDisconnectCallback((ack) => {
        console.log('MQTT连接已关闭', ack);
        this.isConnected = false;
        this.attemptReconnect();
      });

      // 连接MQTT服务器
      newClient.connect();
    } catch (error) {
      console.error('MQTT初始化失败:', error);
      this.attemptReconnect();
    }
  }

  /**
   * 尝试重新连接
   */
  private attemptReconnect(): void {
    if (this.reconnectTimerId) {
      return;
    }
    if (!this.isConnected) {
      return;
    }
    console.log('计划5秒后重新连接MQTT服务器');
    this.reconnectTimerId = setTimeout(() => {
      this.reconnectTimerId = null;
      this.connect().catch((error) => {
        console.error('MQTT重连失败:', error);
        this.attemptReconnect();
      });
    }, 5000);
  }

  /**
   * 重新订阅先前的主题
   */
  private resubscribe(): void {
    if (!this.client || !this.isConnected || this.subscriptions.size === 0) {
      return;
    }

    console.log(`重新订阅${this.subscriptions.size}个主题`);
    this.subscriptions.forEach((callback, topic) => {
      try {
        // 如果有之前的订阅，重新订阅
        const onEvent = (data: any) => {
          try {
            // 假设MQTT仅传输字符串
            let payload: string = data.payload;
            const cb = this.messageCallbacks.get(topic);
            if (cb) {
              cb(topic, payload);
            }
          } catch (err) {
            console.error(`处理MQTT消息失败:`, err);
          }
        };

        if (this.client) {
          this.client.subscribe({
            topic: topic,
            qos: MqttQos.AT_LEAST_ONCE,
            onEvent: onEvent,
            onSuccess: () => {
              console.log(`已重新订阅主题: ${topic}`);
            },
            onError: (error) => {
              console.log(`重新订阅主题${topic}失败:`, error);
            },
          });
        }
      } catch (err) {
        console.error(`重新订阅主题${topic}失败:`, err);
      }
    });
  }

  /**
   * 断开MQTT连接
   */
  disconnect(): void {
    if (this.client) {
      // 清除订阅记录
      this.subscriptions.clear();
      this.messageCallbacks.clear();
      
      try {
        // 断开连接
        this.client.disconnect();
      } catch (error) {
        console.error('断开MQTT连接失败:', error);
      }

      try {
        // 移除客户端引用
        this.client = null;
      } catch (error) {
        console.error('清理MQTT客户端失败:', error);
      }

      this.isConnected = false;

      if (this.reconnectTimerId) {
        clearTimeout(this.reconnectTimerId);
        this.reconnectTimerId = null;
      }

      console.log('已断开MQTT连接');
    }
  }

  /**
   * 订阅主题
   */
  subscribe(topic: string, callback: OnMessageCallback): void {
    if (!this.client) {
      console.error('MQTT客户端未初始化');
      return;
    }
    
    // 检查是否已订阅此主题
    if (this.subscriptions.has(topic)) {
      console.log(`主题 ${topic} 已被订阅，更新回调函数`);
      // 只更新回调，不再重复订阅
      this.subscriptions.set(topic, callback);
      this.messageCallbacks.set(topic, callback);
      return;
    }

    // 保存单个回调
    this.subscriptions.set(topic, callback);
    this.messageCallbacks.set(topic, callback);

    // 如果已连接，执行订阅
    if (this.isConnected) {
      try {
        const onEvent = (data: any) => {
          try {
            // MQTT只传输字符串
            let payload: string = data.payload;
            const cb = this.messageCallbacks.get(topic);
            if (cb) {
              cb(topic, payload);
            }
          } catch (err) {
            console.error(`处理MQTT消息失败:`, err);
          }
        };

        this.client.subscribe({
          topic: topic,
          qos: MqttQos.AT_LEAST_ONCE,
          onEvent: onEvent,
          onSuccess: () => {
            console.log(`已订阅主题: ${topic}`);
          },
          onError: (error) => {
            console.error(`订阅主题${topic}失败:`, error);
          },
        });
      } catch (error) {
        console.error(`订阅主题${topic}失败:`, error);
      }
    } else {
      console.log(`主题${topic}将在连接后订阅`);
    }
  }

  /**
   * 取消订阅主题
   */
  unsubscribe(topic: string): void {
    // 直接删除主题的订阅
    this.subscriptions.delete(topic);
    this.messageCallbacks.delete(topic);
    
    // 如果已连接，通知服务器取消订阅
    if (this.client && this.isConnected) {
      try {
        // @d11/react-native-mqtt似乎没有提供取消订阅的方法
        // 目前采用断开重连方式处理
        this.disconnect();
        this.connect();
        console.log(`已取消订阅主题: ${topic}`);
      } catch (error) {
        console.error(`取消订阅主题${topic}失败:`, error);
      }
    }
  }
  
  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    const topics = Array.from(this.subscriptions.keys());
    topics.forEach(topic => {
      this.unsubscribe(topic);
    });
    console.log(`已取消所有${topics.length}个主题的订阅`);
  }

  /**
   * 发布消息
   */
  publish(topic: string, payload: string, IsDeviceUuid: boolean): void {
    if (!this.client || !this.isConnected) {
      console.error('MQTT客户端未连接，无法发布消息');
      return;
    }
    mqttApiService.publishMqttMessage(topic, IsDeviceUuid ? payload : undefined, IsDeviceUuid ? undefined : payload);
  }

  /**
   * 注册连接回调
   */
  onConnect(callback: OnConnectCallback): void {
    this.connectCallbacks.push(callback);

    // 如果已经连接，立即调用回调
    if (this.isConnected) {
      callback();
    }
  }

  /**
   * 注册错误回调
   */
  onError(callback: OnErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * 获取设备数据主题
   */
  getDataTopic(deviceUuid: string): string {
    return DATA_TOPIC_FORMAT.replace('{device_uuid}', deviceUuid);
  }

  /**
   * 获取设备配置下发主题
   */
  getConfigDownTopic(deviceUuid: string): string {
    return CONFIG_DOWN_TOPIC_FORMAT.replace('{device_uuid}', deviceUuid);
  }

  /**
   * 获取设备配置上传主题
   */
  getConfigUpTopic(deviceUuid: string): string {
    return CONFIG_UP_TOPIC_FORMAT.replace('{device_uuid}', deviceUuid);
  }

  /**
   * 订阅设备数据
   */
  subscribeDeviceData(deviceUuid: string, callback: (data: DataPayload) => void): void {
    const handler = () => {
      const topic = this.getDataTopic(deviceUuid);
      this.subscribe(topic, (_, payload) => {
        try {
          console.log(`收到原始消息: 类型=${typeof payload}, 长度=${payload.length}`);

          // 尝试将字符串解码为Base64
          try {
            const binaryData = base64ToUint8Array(payload);
            console.log(`Base64解码后长度: ${binaryData.length}`);

            // 使用@bufbuild/protobuf的fromBinary解析
            const dataPayload = fromBinary(DataPayloadSchema, binaryData);
            console.log(JSON.stringify(dataPayload), 'payloadpayloadpayload');
            callback(dataPayload);
          } catch (base64Error) {
            console.error(`Base64解码失败: ${base64Error}`);

            // 如果不是有效的Base64编码，尝试直接解析
            const dataPayload = fromBinary(DataPayloadSchema, new TextEncoder().encode(payload));
            callback(dataPayload);
          }
        } catch (error) {
          console.error(`解析设备数据失败: ${error}`);
        }
      });
    };
    if (!this.client || this.isConnected) {
      this.connect().then(() => handler());
    } else {
      handler();
    }
  }

  /**
   * 订阅设备配置
   */
  subscribeDeviceConfig(deviceUuid: string, callback: (result: ConfigPayload | boolean) => void): void {
    const topic = this.getConfigUpTopic(deviceUuid) + '/response';
    this.subscribe(topic, (_, payload) => {
      try {
        const payload2 = Buffer.from(payload,"base64").toString("utf-8");
        // 检查是否为FAIL字符串
        if (payload2 === 'FAIL') {
          callback(false);
          return;
        }
        
        // 尝试将字符串解码为Base64
        try {
          const binaryData = base64ToUint8Array(payload);
          // 使用@bufbuild/protobuf的fromBinary解析
          const configPayload = fromBinary(ConfigPayloadSchema, binaryData);
          callback(configPayload);
        } catch (base64Error) {
          console.error(`Base64解码失败: ${base64Error}`);
          // 如果不是有效的Base64编码，尝试直接解析
          const configPayload = fromBinary(ConfigPayloadSchema, new TextEncoder().encode(payload));
          callback(configPayload);
        }
      } catch (error) {
        console.error(`解析设备配置失败: ${error}`);
      }
    });
  }

  /**
   * 订阅设备配置下发响应
   */
  subscribeDeviceConfigResponse(deviceUuid: string, callback: (success: boolean) => void): void {
    const topic = this.getConfigDownTopic(deviceUuid) + '/response';
    this.subscribe(topic, (_, payload) => {
      try {
        payload = Buffer.from(payload,"base64").toString("utf-8");
        console.log('收到设备配置下发响应', payload);
        // 检查响应中是否包含"OK"
        if (payload.includes('OK')) {
          callback(true); // 响应成功
        } else {
          callback(false); // 响应失败
        }
      } catch (error) {
        console.error(`解析设备配置下发响应失败: ${error}`);
        callback(false); // 发生错误，响应失败
      }
    });
  }
  /**
   * 发送设备配置
   */
  sendDeviceConfig(deviceUuid: string, config: ConfigPayload): void {
    const topic = this.getConfigDownTopic(deviceUuid);
    // 使用@bufbuild/protobuf的toBinary序列化
    const binaryData = toBinary(ConfigPayloadSchema, config);
    // 转换为Base64字符串
    const base64String = uint8ArrayToBase64(binaryData);
    // 发布Base64字符串
    this.publish(topic, base64String, false);
  }

  /**
   * 请求设备配置
   */
  requestDeviceConfig(masterDeviceUuid: string, deviceUuid: string): void {
    const topic = this.getConfigUpTopic(masterDeviceUuid);
    const uuid = Buffer.from(deviceUuid).toString('base64');
    this.publish(topic, uuid, true);
  }
}

// 导出单例实例
const mqttService = new MqttService();
export default mqttService;
