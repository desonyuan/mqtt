/**
 * 模拟数据生成工具 - 用于生成测试和演示用的模拟数据
 */

// 生成随机的12位MAC地址
const generateDeviceUuid = (): string => {
  return Array.from({ length: 12 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

// 固定使用同一个设备ID以保持一致性
const DEVICE_UUID = "AABBCCDDEEFF";

// 获取当前时间戳（秒）
const getCurrentTimestamp = (): number => {
  return Math.floor(Date.now() / 1000);
};

// 在指定范围内生成随机数
const getRandomInRange = (min: number, max: number): number => {
  return Number((Math.random() * (max - min) + min).toFixed(1));
};

/**
 * 设备传感器数据结构
 */
export interface SensorData {
  device_uuid: string;
  temperature: number;
  humidity: number;
  light: number;
  soil_moisture: number;
  co2: number;
  timestamp: number;
}

/**
 * 警报数据结构
 */
export interface AlertData {
  device_uuid: string;
  alert_type: number;
  alert_name: string;
  timestamp: number;
}

/**
 * 生成传感器模拟数据
 * @returns 传感器数据
 */
export const generateSensorData = (): SensorData => {
  return {
    device_uuid: DEVICE_UUID,
    temperature: getRandomInRange(23, 26),
    humidity: getRandomInRange(45, 57),
    light: getRandomInRange(600, 1200),
    soil_moisture: getRandomInRange(20, 40),
    co2: getRandomInRange(800, 1000),
    timestamp: getCurrentTimestamp()
  };
};

/**
 * 固定的传感器数据表格（不变）
 */
export const staticSensorData: SensorData[] = Array.from({ length: 5 }, () => ({
  device_uuid: DEVICE_UUID,
  temperature: getRandomInRange(23, 26),
  humidity: getRandomInRange(45, 57),
  light: getRandomInRange(600, 1200),
  soil_moisture: getRandomInRange(20, 40),
  co2: getRandomInRange(800, 1000),
  timestamp: getCurrentTimestamp()
}));

/**
 * 警报类型枚举
 */
enum AlertType {
  ALARM = 1, // 告警
  NOTIFICATION = 2 // 通知
}

/**
 * 告警名称枚举
 */
enum AlarmNames {
  FIRE = "发生火灾",
  HUMAN_DETECTED = "检测到人"
}

/**
 * 通知名称枚举
 */
enum NotificationNames {
  SOIL_RELAY_ON = "土壤湿度继电器开启",
  SOIL_RELAY_OFF = "土壤湿度继电器关闭"
}

/**
 * 生成随机的警报数据
 */
export const generateAlertData = (type?: AlertType): AlertData => {
  const alertType = type || (Math.random() > 0.5 ? AlertType.ALARM : AlertType.NOTIFICATION);
  let alertName = "";
  
  if (alertType === AlertType.ALARM) {
    alertName = Math.random() > 0.5 ? AlarmNames.FIRE : AlarmNames.HUMAN_DETECTED;
  } else {
    alertName = Math.random() > 0.5 ? NotificationNames.SOIL_RELAY_ON : NotificationNames.SOIL_RELAY_OFF;
  }
  
  return {
    device_uuid: DEVICE_UUID,
    alert_type: alertType,
    alert_name: alertName,
    timestamp: getCurrentTimestamp()
  };
};

/**
 * 固定的警报数据表格（不变）
 */
export const staticAlertData: AlertData[] = [
  {
    device_uuid: DEVICE_UUID,
    alert_type: AlertType.ALARM,
    alert_name: AlarmNames.FIRE,
    timestamp: getCurrentTimestamp()
  },
  {
    device_uuid: DEVICE_UUID,
    alert_type: AlertType.ALARM,
    alert_name: AlarmNames.HUMAN_DETECTED,
    timestamp: getCurrentTimestamp() - 300
  },
  {
    device_uuid: DEVICE_UUID,
    alert_type: AlertType.NOTIFICATION,
    alert_name: NotificationNames.SOIL_RELAY_ON,
    timestamp: getCurrentTimestamp() - 600
  },
  {
    device_uuid: DEVICE_UUID,
    alert_type: AlertType.NOTIFICATION,
    alert_name: NotificationNames.SOIL_RELAY_OFF,
    timestamp: getCurrentTimestamp() - 900
  },
  {
    device_uuid: DEVICE_UUID,
    alert_type: AlertType.ALARM,
    alert_name: AlarmNames.FIRE,
    timestamp: getCurrentTimestamp() - 1200
  }
];

/**
 * 实时图表数据类 - 管理持续更新的传感器数据
 */
class RealTimeChartData {
  private data: SensorData[] = [];
  private maxItems: number = 20;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * 获取当前图表数据
   */
  getData(): SensorData[] {
    return [...this.data];
  }

  /**
   * 添加新的传感器数据
   */
  private addData(): void {
    const newData = generateSensorData();
    
    if (this.data.length >= this.maxItems) {
      // 移除最旧的数据
      this.data.shift();
    }
    
    // 添加新数据
    this.data.push(newData);
  }

  /**
   * 开始生成实时数据
   * @param intervalMs 数据生成间隔(毫秒)
   * @param initialCount 初始数据量
   */
  startGenerating(intervalMs: number = 1000, initialCount: number = 10): void {
    // 停止任何现有的数据生成
    this.stopGenerating();
    
    // 清除现有数据
    this.data = [];
    
    // 生成初始数据
    for (let i = 0; i < initialCount; i++) {
      this.addData();
    }
    
    // 开始定时生成新数据
    this.intervalId = setInterval(() => {
      this.addData();
    }, intervalMs);
  }

  /**
   * 停止生成实时数据
   */
  stopGenerating(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const realTimeChart = new RealTimeChartData();

export default {
  staticSensorData,
  staticAlertData,
  realTimeChart,
  generateSensorData,
  generateAlertData
}; 