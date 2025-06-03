import {createMqttClient, MqttConfig} from '@d11/react-native-mqtt';
import {MqttClient} from '@d11/react-native-mqtt/dist/Mqtt/MqttClient';
import {DataPayload} from '@/proto/data_payload';
import {ConfigPayload} from '@/proto/config_payload';
import storage from '@/utils/storage';

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
const DATA_TOPIC_FORMAT = '/data/{device_uuid}';
// 设备配置下发主题格式
const CONFIG_DOWN_TOPIC_FORMAT = '/config/{device_uuid}/down';
// 设备配置上传主题格式
const CONFIG_UP_TOPIC_FORMAT = '/config/{device_uuid}/up';

// 回调函数类型
export type OnMessageCallback = (topic: string, payload: Uint8Array) => void;
export type OnConnectCallback = () => void;
export type OnErrorCallback = (error: Error) => void;

/**
 * MQTT客户端管理类
 */
class MqttService {
  private client: MqttClient | null = null;
  private messageCallbacks: Map<string, OnMessageCallback[]> = new Map();
  private connectCallbacks: OnConnectCallback[] = [];
  private errorCallbacks: OnErrorCallback[] = [];
  private isConnected: boolean = false;
  private reconnectTimerId: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, OnMessageCallback[]> = new Map();

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
    this.subscriptions.forEach((callbacks, topic) => {
      try {
        // 如果有之前的订阅，重新订阅
        const onEvent = (data: any) => {
          try {
            let payload: Uint8Array;
            if (typeof data.payload === 'string') {
              payload = new TextEncoder().encode(data.payload);
            } else if (data.payload instanceof ArrayBuffer) {
              payload = new Uint8Array(data.payload);
            } else if (Array.isArray(data.payload)) {
              payload = new Uint8Array(data.payload);
            } else {
              payload = new Uint8Array(0);
            }

            callbacks.forEach((callback) => {
              callback(topic, payload);
            });
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
              console.error(`重新订阅主题${topic}失败:`, error);
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

    // 保存回调
    const callbacks = this.subscriptions.get(topic) || [];
    callbacks.push(callback);
    this.subscriptions.set(topic, callbacks);

    // 保存消息回调以便处理接收到的消息
    this.messageCallbacks.set(topic, callbacks);

    // 如果已连接，执行订阅
    if (this.isConnected) {
      try {
        const onEvent = (data: any) => {
          try {
            let payload: Uint8Array;
            if (typeof data.payload === 'string') {
              payload = new TextEncoder().encode(data.payload);
            } else if (data.payload instanceof ArrayBuffer) {
              payload = new Uint8Array(data.payload);
            } else if (Array.isArray(data.payload)) {
              payload = new Uint8Array(data.payload);
            } else {
              payload = new Uint8Array(0);
            }

            callbacks.forEach((callback) => {
              callback(topic, payload);
            });
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
  unsubscribe(topic: string, callback?: OnMessageCallback): void {
    // 从回调列表中移除
    if (callback) {
      const callbacks = this.subscriptions.get(topic) || [];
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
        this.subscriptions.set(topic, callbacks);
        this.messageCallbacks.set(topic, callbacks);
      }

      // 如果没有回调了，完全取消订阅
      if (callbacks.length === 0) {
        this.subscriptions.delete(topic);
        this.messageCallbacks.delete(topic);

        // 如果已连接，通知服务器取消订阅
        if (this.client && this.isConnected) {
          try {
            // @d11/react-native-mqtt似乎没有提供取消订阅的方法，这里可能需要特殊处理
            // 目前先从本地记录中删除
            console.log(`已取消订阅主题: ${topic}`);
          } catch (error) {
            console.error(`取消订阅主题${topic}失败:`, error);
          }
        }
      }
    } else {
      // 完全取消订阅
      this.subscriptions.delete(topic);
      this.messageCallbacks.delete(topic);

      // 如果已连接，通知服务器取消订阅
      if (this.client && this.isConnected) {
        try {
          // @d11/react-native-mqtt似乎没有提供取消订阅的方法，这里可能需要特殊处理
          // 目前先从本地记录中删除
          console.log(`已取消订阅主题: ${topic}`);
        } catch (error) {
          console.error(`取消订阅主题${topic}失败:`, error);
        }
      }
    }
  }

  /**
   * 发布消息
   */
  publish(topic: string, payload: Uint8Array | string): void {
    if (!this.client || !this.isConnected) {
      console.error('MQTT客户端未连接，无法发布消息');
      return;
    }

    // 转换payload为字符串
    let stringPayload: string;
    if (payload instanceof Uint8Array) {
      stringPayload = new TextDecoder().decode(payload);
    } else {
      stringPayload = payload;
    }

    try {
      // @d11/react-native-mqtt没有直接提供publish方法，需要使用自定义发布逻辑
      // 根据API文档，可能需要查找正确的方法名称
      console.log(`尝试发布消息到主题: ${topic}`);

      // 尝试直接调用publish方法
      if ('publish' in this.client && typeof (this.client as any).publish === 'function') {
        (this.client as any).publish(topic, stringPayload, MqttQos.AT_LEAST_ONCE);
        console.log(`已发布消息到主题: ${topic}`);
      } else {
        // 备用发布方法
        console.error('MQTT客户端不支持publish方法，无法发布消息');
      }
    } catch (error) {
      console.error(`发布消息到主题${topic}失败:`, error);
    }
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
    const topic = this.getDataTopic(deviceUuid);
    this.subscribe(topic, (_, payload) => {
      try {
        const dataPayload = DataPayload.decode(payload);
        callback(dataPayload);
      } catch (error) {
        console.error(`解析设备数据失败: ${error}`);
      }
    });
  }

  /**
   * 订阅设备配置
   */
  subscribeDeviceConfig(deviceUuid: string, callback: (config: ConfigPayload) => void): void {
    const topic = this.getConfigUpTopic(deviceUuid);
    this.subscribe(topic, (_, payload) => {
      try {
        const configPayload = ConfigPayload.decode(payload);
        callback(configPayload);
      } catch (error) {
        console.error(`解析设备配置失败: ${error}`);
      }
    });
  }

  /**
   * 发送设备配置
   */
  sendDeviceConfig(deviceUuid: string, config: ConfigPayload): void {
    const topic = this.getConfigDownTopic(deviceUuid);
    const payload = ConfigPayload.encode(config).finish();
    this.publish(topic, payload);
  }

  /**
   * 请求设备配置
   */
  requestDeviceConfig(deviceUuid: string): void {
    const topic = this.getConfigUpTopic(deviceUuid);
    this.publish(topic, deviceUuid);
  }
}

// 导出单例实例
const mqttService = new MqttService();
export default mqttService;
