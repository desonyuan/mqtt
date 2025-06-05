import { View, ScrollView, TextInput, Switch, Modal, ActivityIndicator } from 'react-native';
import { Button, Card, Text, useTheme, Menu, Divider, Checkbox, Snackbar } from 'react-native-paper';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import mqttService from '@/services/mqtt';
import deviceApi from '@/services/deviceApi';
import { type ConfigPayload, ConfigPayloadSchema, ThresholdConfigSchema } from '@/proto/config_payload_pb';
import { useAuth } from '@/contexts/AuthContext';
import { DeviceOnlineStatus } from '@/services/deviceApi';
import { create } from "@bufbuild/protobuf";

// 传感器类型枚举
enum SensorType {
  SHT4X = 0,    // 温湿度传感器
  TSL2591 = 1,  // 光照传感器
  SCD41 = 2,    // CO2传感器
  MOISTURE = 3, // 土壤湿度传感器
}

// 阈值取值类型枚举
enum ThresholdValueType {
  RAW = 0,     // 原始传感器值
  AVERAGE = 1, // 滑动窗口平均值
  MAX = 2,     // 滑动窗口最大值
}

// 设备模式枚举
enum DeviceMode {
  MASTER = 0,
  SLAVE = 1,
}

// 阈值配置接口
interface ThresholdConfig {
  upper_threshold: number;
  lower_threshold: number;
  upper_enabled: boolean;
  lower_enabled: boolean;
  data_value_type: ThresholdValueType;
}

// 设备配置接口
interface ConfigPayloadState {
  device_uuid: string;
  wifi_ssid: string;
  wifi_password: string;
  device_mode: DeviceMode;
  slave_uuids: string[];
  master_uuid: string;
  pir_sensor_enabled: boolean;
  light_pwm_target: number;
  pwm_enabled: boolean;
  thresholds: Map<SensorType, ThresholdConfig>;
}

const DeviceConfigPage = () => {
  const theme = useTheme();
  const { device_uuid, master_device_uuid, owner_uuid } = useLocalSearchParams<{
    device_uuid: string;
    master_device_uuid: string;
    owner_uuid: string;
  }>();
  
  const { userRole } = useAuth();
  const [config, setConfig] = useState<ConfigPayloadState | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [onlineMasters, setOnlineMasters] = useState<string[]>([]);
  const [onlineMastersLoading, setOnlineMastersLoading] = useState(true);
  const [processingDevices, setProcessingDevices] = useState(false);
  
  // 从设备管理状态
  const [slaveModalVisible, setSlaveModalVisible] = useState(false);
  const [selectedMasters, setSelectedMasters] = useState<string[]>([]);
  const [currentSlaves, setCurrentSlaves] = useState<string[]>([]);
  const [removedSlaves, setRemovedSlaves] = useState<string[]>([]);
  const [failedDevices, setFailedDevices] = useState<string[]>([]);
  
  // 菜单可见状态
  const [visibleMenu, setVisibleMenu] = useState<{[key: number]: boolean}>({});

  // 获取设备配置
  const fetchDeviceConfig = useCallback(async () => {
    if (!master_device_uuid || !device_uuid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 订阅配置响应
      mqttService.subscribeDeviceConfig(
        master_device_uuid,
        (result: any) => {
          if (result === false) {
            setError('配置获取失败');
            setLoading(false);
          } else if (result && typeof result === 'object') {
            // 直接使用对象属性
            const configData: ConfigPayloadState = {
              device_uuid: result.deviceUuid || '',
              wifi_ssid: result.wifiSsid || '',
              wifi_password: result.wifiPassword || '',
              device_mode: result.deviceMode || DeviceMode.MASTER,
              slave_uuids: result.slaveUuids || [],
              master_uuid: result.masterUuid || '',
              pir_sensor_enabled: result.pirSensorEnabled || false,
              light_pwm_target: result.lightPwmTarget || 0,
              pwm_enabled: result.pwmEnabled || false,
              thresholds: new Map(),
            };
            
            // 转换阈值配置
            if (result.thresholds) {
              Object.entries(result.thresholds).forEach(([key, value]: [string, any]) => {
                const sensorType = parseInt(key);
                configData.thresholds.set(sensorType, {
                  upper_threshold: value.upperThreshold || 0,
                  lower_threshold: value.lowerThreshold || 0,
                  upper_enabled: value.upperEnabled || false,
                  lower_enabled: value.lowerEnabled || false,
                  data_value_type: value.dataValueType || ThresholdValueType.RAW,
                });
              });
            }
            
            setConfig(configData);
            setCurrentSlaves(configData.slave_uuids);
            setLoading(false);
          }
        }
      );
      
      // 请求设备配置
      mqttService.requestDeviceConfig(master_device_uuid, device_uuid);
      
      // 设置超时重试
      const timeout = setTimeout(() => {
        if (!config && retryCount < 3) {
          setRetryCount(prev => prev + 1);
          fetchDeviceConfig();
        } else if (retryCount >= 3) {
          setError('配置获取超时，请重试');
          setLoading(false);
        }
      }, 30000);
      
      return () => clearTimeout(timeout);
    } catch (err) {
      setError('配置获取失败');
      setLoading(false);
    }
  }, [master_device_uuid, device_uuid, retryCount, config]);

  // 获取在线设备
  const fetchOnlineDevices = useCallback(async () => {
    setOnlineMastersLoading(true);
    try {
      let devices: DeviceOnlineStatus[] = [];
      
      if (userRole === 'admin') {
        devices = await deviceApi.getOnlineDevices(owner_uuid);
      } else if (userRole === 'senior') {
        devices = await deviceApi.getOnlineDevices();
      }
      
      const uuids = devices.map(device => device.device_uuid);
      setOnlineMasters(uuids);
    } catch (err) {
      console.error('获取在线设备失败:', err);
      setSnackbarMessage('获取在线设备失败');
      setSnackbarVisible(true);
    } finally {
      setOnlineMastersLoading(false);
    }
  }, [userRole, owner_uuid]);

  // 组件挂载时获取数据
  useEffect(() => {
    fetchDeviceConfig();
    fetchOnlineDevices();
  }, [fetchDeviceConfig, fetchOnlineDevices]);

  // 处理单个添加从设备
  const processAddSlave = async (deviceUuid: string): Promise<boolean> => {
    let tempConfig: any = undefined;
    let tempResponse: boolean | undefined = undefined;
    let retryCount = 0;
    
    try {
      // 重连MQTT
      await reconnectMqtt();
      
      // 订阅配置
      mqttService.subscribeDeviceConfig(
        deviceUuid,
        (result: any) => {
          tempConfig = result;
        }
      );
      
      // 订阅响应
      mqttService.subscribeDeviceConfigResponse(
        deviceUuid,
        (success: boolean) => {
          tempResponse = success;
        }
      );
      
      // 请求设备配置
      mqttService.requestDeviceConfig(deviceUuid, deviceUuid);
      
      // 等待配置响应，最多10秒
      while (tempConfig === undefined && retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
        
        if (retryCount === 3 && tempConfig === undefined) {
          throw new Error(`获取设备${deviceUuid}配置失败`);
        }
      }
      
      // 如果是false，表示失败
      if (tempConfig === false) {
        throw new Error(`设备${deviceUuid}配置获取失败`);
      }
      
      // 如果配置有slave_uuids且不为空，表示是主设备，不能添加
      if (tempConfig.slaveUuids && tempConfig.slaveUuids.length > 0) {
        throw new Error(`设备${deviceUuid}已有从设备，无法添加`);
      }
      
      // 修改为从设备配置
      tempConfig.masterUuid = master_device_uuid;
      tempConfig.deviceMode = DeviceMode.SLAVE;
      
      // 发送配置
      const configPayload = tempConfig;
      mqttService.sendDeviceConfig(deviceUuid, configPayload);
      
      // 等待响应，最多10秒
      retryCount = 0;
      while (tempResponse === undefined && retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
        
        if (retryCount === 3 && tempResponse === undefined) {
          throw new Error(`设备${deviceUuid}配置发送超时`);
        }
      }
      
      // 如果是false，表示失败
      if (tempResponse === false) {
        throw new Error(`设备${deviceUuid}配置发送失败`);
      }
      
      return true;
    } catch (error) {
      console.error(`添加从设备${deviceUuid}失败:`, error);
      return false;
    }
  };

  // 处理单个移除从设备
  const processRemoveSlave = async (deviceUuid: string): Promise<boolean> => {
    let tempConfig: any = undefined;
    let tempResponse: boolean | undefined = undefined;
    let retryCount = 0;
    
    try {
      // 重连MQTT
      await reconnectMqtt();
      
      // 订阅配置
      mqttService.subscribeDeviceConfig(
        master_device_uuid!,
        (result: any) => {
          tempConfig = result;
        }
      );
      
      // 订阅响应
      mqttService.subscribeDeviceConfigResponse(
        master_device_uuid!,
        (success: boolean) => {
          tempResponse = success;
        }
      );
      
      // 请求设备配置
      mqttService.requestDeviceConfig(master_device_uuid!, deviceUuid);
      
      // 等待配置响应，最多10秒
      while (tempConfig === undefined && retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
        
        if (retryCount === 3 && tempConfig === undefined) {
          throw new Error(`获取设备${deviceUuid}配置失败`);
        }
      }
      
      // 如果是false，表示失败
      if (tempConfig === false) {
        throw new Error(`设备${deviceUuid}配置获取失败`);
      }
      
      // 修改为主设备配置
      tempConfig.masterUuid = null;
      tempConfig.deviceMode = DeviceMode.MASTER;
      
      // 发送配置
      const configPayload = tempConfig;
      mqttService.sendDeviceConfig(master_device_uuid!, configPayload);
      
      // 等待响应，最多10秒
      retryCount = 0;
      while (tempResponse === undefined && retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
        
        if (retryCount === 3 && tempResponse === undefined) {
          throw new Error(`设备${deviceUuid}配置发送超时`);
        }
      }
      
      // 如果是false，表示失败
      if (tempResponse === false) {
        throw new Error(`设备${deviceUuid}配置发送失败`);
      }
      
      return true;
    } catch (error) {
      console.error(`移除从设备${deviceUuid}失败:`, error);
      return false;
    }
  };

  // 处理表单提交
  const handleSubmit = async () => {
    if (!config || !master_device_uuid) return;
    
    try {
      setProcessingDevices(true);
      setFailedDevices([]);
      
      // 处理添加从设备
      const successfullyAdded: string[] = [];
      for (const deviceUuid of selectedMasters) {
        const success = await processAddSlave(deviceUuid);
        if (success) {
          successfullyAdded.push(deviceUuid);
        } else {
          setFailedDevices(prev => [...prev, deviceUuid]);
        }
      }
      
      // 处理移除从设备
      const successfullyRemoved: string[] = [];
      for (const deviceUuid of removedSlaves) {
        const success = await processRemoveSlave(deviceUuid);
        if (success) {
          successfullyRemoved.push(deviceUuid);
        } else {
          setFailedDevices(prev => [...prev, deviceUuid]);
        }
      }
      
      // 合并从设备列表
      const newSlaves = [
        ...successfullyAdded,
        ...currentSlaves.filter(slave => !successfullyRemoved.includes(slave))
      ];
      
      // 更新主设备配置
      const finalConfig = {
        ...config,
        slave_uuids: newSlaves
      };
      
      // 重新连接MQTT
      await reconnectMqtt();
      
      // 订阅配置响应
      let tempResponse: boolean | undefined = undefined;
      mqttService.subscribeDeviceConfigResponse(
        master_device_uuid,
        (success: boolean) => {
          tempResponse = success;
        }
      );
      
      // 创建ProtoBuffer配置
      const configPayload = createConfigPayload(finalConfig);
      
      // 发送配置
      mqttService.sendDeviceConfig(master_device_uuid, configPayload);
      
      // 等待响应
      let retryCount = 0;
      while (tempResponse === undefined && retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
        retryCount++;
        
        if (retryCount === 3 && tempResponse === undefined) {
          throw new Error('配置保存超时');
        }
      }
      
      if (tempResponse === false) {
        throw new Error('配置保存失败');
      }
      
      // 成功提示
      setSnackbarMessage('配置保存成功');
      setSnackbarVisible(true);
      
      // 更新配置
      setConfig(finalConfig);
      setCurrentSlaves(newSlaves);
      setSelectedMasters([]);
      setRemovedSlaves([]);
      
    } catch (err: any) {
      console.error('保存配置失败:', err);
      setSnackbarMessage(err.message || '配置保存失败');
      setSnackbarVisible(true);
    } finally {
      setProcessingDevices(false);
    }
  };

  // 更新阈值配置
  const updateThreshold = (sensorType: SensorType, field: keyof ThresholdConfig, value: any) => {
    if (!config) return;
    
    setConfig(prev => {
      if (!prev) return prev;
      
      const newThresholds = new Map(prev.thresholds);
      const currentConfig = newThresholds.get(sensorType) || {
        upper_threshold: 0,
        lower_threshold: 0,
        upper_enabled: false,
        lower_enabled: false,
        data_value_type: ThresholdValueType.RAW
      };
      
      // 特殊规则：土壤湿度下限使能时自动启用上限
      if (sensorType === SensorType.MOISTURE && field === 'lower_enabled' && value) {
        currentConfig.upper_enabled = true;
      }
      
      // PWM启用时隐藏光照传感器配置
      if (sensorType === SensorType.TSL2591 && prev.pwm_enabled) {
        currentConfig.upper_enabled = false;
        currentConfig.lower_enabled = false;
      }
      
      newThresholds.set(sensorType, {
        ...currentConfig,
        [field]: value
      });
      
      return {
        ...prev,
        thresholds: newThresholds
      };
    });
  };

  // 创建ProtoBuffer配置对象
  const createConfigPayload = (configState: ConfigPayloadState) => {
    // 创建阈值配置对象
    const thresholdsObj: { [key: string]: any } = {};
    configState.thresholds.forEach((value, key) => {
      thresholdsObj[key] = create(ThresholdConfigSchema, {
        upperThreshold: value.upper_threshold,
        lowerThreshold: value.lower_threshold,
        upperEnabled: value.upper_enabled,
        lowerEnabled: value.lower_enabled,
        dataValueType: value.data_value_type
      });
    });
    
    // 创建配置对象
    return create(ConfigPayloadSchema, {
      deviceUuid: configState.device_uuid,
      wifiSsid: configState.wifi_ssid,
      wifiPassword: configState.wifi_password,
      deviceMode: configState.device_mode,
      slaveUuids: configState.slave_uuids,
      masterUuid: configState.master_uuid,
      pirSensorEnabled: configState.pir_sensor_enabled,
      lightPwmTarget: configState.light_pwm_target,
      pwmEnabled: configState.pwm_enabled,
      thresholds: thresholdsObj
    });
  };

  // 重连MQTT
  const reconnectMqtt = async () => {
    mqttService.disconnect();
    return new Promise<void>((resolve) => {
      mqttService.onConnect(() => {
        resolve();
      });
      mqttService.connect();
    });
  };

  // 渲染阈值配置部分
  const renderThresholdConfig = (sensorType: SensorType, sensorName: string) => {
    if (!config) return null;
    
    // 特殊规则：PWM启用时隐藏光照传感器配置
    if (sensorType === SensorType.TSL2591 && config.pwm_enabled) {
      return null;
    }
    
    const threshold = config.thresholds.get(sensorType);
    if (!threshold) return null;
    
    // 取值类型菜单选项
    const valueTypeOptions = [
      { label: '原始传感器值', value: ThresholdValueType.RAW },
      { label: '滑动窗口平均值', value: ThresholdValueType.AVERAGE },
      { label: '滑动窗口最大值', value: ThresholdValueType.MAX },
    ];
    
    return (
      <Card style={{ 
        marginVertical: 8, 
        backgroundColor: theme.colors.surface,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary
      }}>
        <Card.Content>
        <Text variant="titleLarge" style={{ color: theme.colors.primary }}>{sensorName}配置</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ color: theme.colors.onSurface, marginBottom: 5 }}>阈值上限:</Text>
              <TextInput
                placeholder="上限值"
                value={threshold.upper_threshold.toString()}
                onChangeText={(text) => updateThreshold(sensorType, 'upper_threshold', parseFloat(text) || 0)}
                keyboardType="numeric"
                style={{ 
                  borderWidth: 1, 
                  borderColor: theme.colors.outline, 
                  borderRadius: 4,
                  padding: 10,
                  backgroundColor: theme.colors.surface
                }}
              />
            </View>
            
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.onSurface, marginBottom: 5 }}>阈值下限:</Text>
              <TextInput
                placeholder="下限值"
                value={threshold.lower_threshold.toString()}
                onChangeText={(text) => updateThreshold(sensorType, 'lower_threshold', parseFloat(text) || 0)}
                keyboardType="numeric"
                style={{ 
                  borderWidth: 1, 
                  borderColor: theme.colors.outline, 
                  borderRadius: 4,
                  padding: 10,
                  backgroundColor: theme.colors.surface
                }}
              />
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={{ color: theme.colors.onSurface, marginRight: 8 }}>启用上限检测:</Text>
              <Switch
                value={threshold.upper_enabled}
                onValueChange={(value) => updateThreshold(sensorType, 'upper_enabled', value)}
              />
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={{ color: theme.colors.onSurface, marginRight: 8 }}>启用下限检测:</Text>
              <Switch
                value={threshold.lower_enabled}
                onValueChange={(value) => updateThreshold(sensorType, 'lower_enabled', value)}
                disabled={sensorType === SensorType.MOISTURE && threshold.lower_enabled && !threshold.upper_enabled}
              />
            </View>
          </View>
          
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: theme.colors.onSurface, marginBottom: 5 }}>取值类型:</Text>
            <Menu
              visible={visibleMenu[sensorType] || false}
              onDismiss={() => setVisibleMenu(prev => ({...prev, [sensorType]: false}))}
              anchor={
                <Button 
                  mode="outlined" 
                  onPress={() => setVisibleMenu(prev => ({...prev, [sensorType]: true}))}
                  style={{ borderColor: theme.colors.outline }}
                >
                  {valueTypeOptions.find(opt => opt.value === threshold.data_value_type)?.label || '选择类型'}
                </Button>
              }>
              {valueTypeOptions.map((option, index) => (
                <Menu.Item
                  key={index}
                  title={option.label}
                  onPress={() => {
                    updateThreshold(sensorType, 'data_value_type', option.value);
                    setVisibleMenu(prev => ({...prev, [sensorType]: false}));
                  }}
                />
              ))}
            </Menu>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // 保存从设备弹窗配置（不更新主配置）
  const saveSlaveModalConfig = () => {
    setSlaveModalVisible(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>加载设备配置中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.error, fontSize: 18, marginBottom: 16 }}>
          {error}
        </Text>
        <Button mode="contained" onPress={fetchDeviceConfig}>
          重试
        </Button>
      </View>
    );
  }

  if (!config) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>未获取到设备配置</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView 
        contentContainerStyle={{ 
          padding: 16,
          paddingBottom: 100 // 为底部按钮留出空间
        }}
      >
        {/* 设备UUID (只读) */}
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content>
            <Text variant="titleLarge" style={{ color: theme.colors.primary }}>设备信息</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: theme.colors.onSurface }}>设备UUID:</Text>
              <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{config.device_uuid}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Wi-Fi配置 */}
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content>
            <Text variant="titleLarge" style={{ color: theme.colors.primary }}>Wi-Fi设置</Text>
            
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: theme.colors.onSurface, marginBottom: 5 }}>Wi-Fi SSID:</Text>
              <TextInput
                value={config.wifi_ssid}
                onChangeText={(text) => setConfig({ ...config, wifi_ssid: text })}
                style={{ 
                  borderWidth: 1, 
                  borderColor: theme.colors.outline, 
                  borderRadius: 4,
                  padding: 12,
                  backgroundColor: theme.colors.surface,
                  fontSize: 16
                }}
              />
            </View>
            
            <View style={{ marginTop: 15 }}>
              <Text style={{ color: theme.colors.onSurface, marginBottom: 5 }}>Wi-Fi密码:</Text>
              <TextInput
                value={config.wifi_password}
                onChangeText={(text) => setConfig({ ...config, wifi_password: text })}
                secureTextEntry
                style={{ 
                  borderWidth: 1, 
                  borderColor: theme.colors.outline, 
                  borderRadius: 4,
                  padding: 12,
                  backgroundColor: theme.colors.surface,
                  fontSize: 16
                }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* 设备模式 (只读) */}
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content>
            <Text variant="titleLarge" style={{ color: theme.colors.primary }}>设备模式</Text>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              marginTop: 10,
              alignItems: 'center'
            }}>
              <Text style={{ color: theme.colors.onSurface }}>当前模式:</Text>
              <View style={{ 
                backgroundColor: theme.colors.primaryContainer, 
                paddingVertical: 4,
                paddingHorizontal: 12,
                borderRadius: 16
              }}>
                <Text style={{ 
                  fontWeight: 'bold', 
                  color: theme.colors.onPrimaryContainer 
                }}>
                  {config.device_mode === DeviceMode.MASTER ? '主设备' : '从设备'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* 从设备配置 (仅主设备显示) */}
        {config.device_mode === DeviceMode.MASTER && (
          <Card style={{ marginBottom: 16, elevation: 2 }}>
            <Card.Content>
              <Text variant="titleLarge" style={{ color: theme.colors.primary }}>从设备管理</Text>
              <Text style={{ marginTop: 10, color: theme.colors.onSurface }}>
                当前从设备: {config.slave_uuids.join(', ')}
              </Text>
              <Button 
                mode="outlined" 
                style={{ marginTop: 15, borderColor: theme.colors.primary }}
                onPress={() => setSlaveModalVisible(true)}
              >
                管理从设备
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* 主设备UUID (仅从设备显示) */}
        {config.device_mode === DeviceMode.SLAVE && (
          <Card style={{ marginBottom: 16, elevation: 2 }}>
            <Card.Content>
              <Text variant="titleLarge" style={{ color: theme.colors.primary }}>主设备设置</Text>
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: theme.colors.onSurface, marginBottom: 5 }}>主设备UUID:</Text>
                <TextInput
                  value={config.master_uuid}
                  onChangeText={(text) => setConfig({ ...config, master_uuid: text })}
                  style={{ 
                    borderWidth: 1, 
                    borderColor: theme.colors.outline, 
                    borderRadius: 4,
                    padding: 12,
                    backgroundColor: theme.colors.surface,
                    fontSize: 16
                  }}
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {/* 传感器开关 */}
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content>
            <Text variant="titleLarge" style={{ color: theme.colors.primary }}>传感器设置</Text>
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginVertical: 12,
              paddingVertical: 8
            }}>
              <View>
                <Text style={{ color: theme.colors.onSurface, fontWeight: '500' }}>启用人感检测</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                  检测人员活动状态
                </Text>
              </View>
              <Switch
                value={config.pir_sensor_enabled}
                onValueChange={(value) => setConfig({ ...config, pir_sensor_enabled: value })}
                thumbColor={config.pir_sensor_enabled ? theme.colors.primary : theme.colors.surface}
              />
            </View>
            
            <Divider style={{ marginVertical: 8 }} />
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginVertical: 12,
              paddingVertical: 8
            }}>
              <View>
                <Text style={{ color: theme.colors.onSurface, fontWeight: '500' }}>启用PWM控制</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                  自动调节灯光亮度
                </Text>
              </View>
              <Switch
                value={config.pwm_enabled}
                onValueChange={(value) => setConfig({ ...config, pwm_enabled: value })}
                thumbColor={config.pwm_enabled ? theme.colors.primary : theme.colors.surface}
              />
            </View>
          </Card.Content>
        </Card>

        {/* PWM目标值 */}
        {config.pwm_enabled && (
          <Card style={{ marginBottom: 16, elevation: 2 }}>
            <Card.Content>
              <Text variant="titleLarge" style={{ color: theme.colors.primary }}>PWM设置</Text>
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: theme.colors.onSurface, marginBottom: 5 }}>灯光PWM目标值:</Text>
                <TextInput
                  value={config.light_pwm_target.toString()}
                  onChangeText={(text) => setConfig({ ...config, light_pwm_target: parseFloat(text) || 0 })}
                  keyboardType="numeric"
                  style={{ 
                    borderWidth: 1, 
                    borderColor: theme.colors.outline, 
                    borderRadius: 4,
                    padding: 12,
                    backgroundColor: theme.colors.surface,
                    fontSize: 16
                  }}
                />
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 5, fontSize: 12 }}>
                  范围: 0-100
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* 阈值配置 */}
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content>
            <Text variant="titleLarge" style={{ color: theme.colors.primary, marginBottom: 10 }}>传感器阈值配置</Text>
            
            {renderThresholdConfig(SensorType.SHT4X, '温湿度传感器')}
            {renderThresholdConfig(SensorType.TSL2591, '光照传感器')}
            {renderThresholdConfig(SensorType.SCD41, 'CO2传感器')}
            {renderThresholdConfig(SensorType.MOISTURE, '土壤湿度传感器')}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* 从设备管理弹窗 - 现代化设计 */}
      <Modal
        visible={slaveModalVisible}
        onDismiss={() => setSlaveModalVisible(false)}
        style={{ 
          backgroundColor: theme.colors.background, 
          padding: 0,
          margin: 20,
          borderRadius: 12,
          overflow: 'hidden'
        }}>
        <ScrollView>
          <View style={{ padding: 20 }}>
            <Text variant="titleLarge" style={{ 
              color: theme.colors.primary, 
              marginBottom: 15,
              fontSize: 20
            }}>
              从设备管理
            </Text>
            
            {onlineMastersLoading ? (
              <View style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="small" />
                <Text style={{ marginTop: 10 }}>加载在线设备中...</Text>
              </View>
            ) : (
              <>
                <Card style={{ marginBottom: 20, backgroundColor: theme.colors.surfaceVariant }}>
                  <Card.Content>
                    <Text style={{ 
                      fontWeight: 'bold', 
                      marginBottom: 10, 
                      color: theme.colors.onSurface,
                      fontSize: 16
                    }}>
                      在线主设备:
                    </Text>
                    {onlineMasters.map((master, index) => (
                      <View key={index} style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        marginBottom: 12,
                        padding: 10,
                        backgroundColor: theme.colors.surface,
                        borderRadius: 8
                      }}>
                        <Checkbox.Android
                          status={selectedMasters.includes(master) ? 'checked' : 'unchecked'}
                          onPress={() => {
                            setSelectedMasters(prev => 
                              prev.includes(master) 
                                ? prev.filter(m => m !== master) 
                                : [...prev, master]
                            );
                          }}
                          color={theme.colors.primary}
                        />
                        <Text style={{ 
                          marginLeft: 12, 
                          color: theme.colors.onSurface,
                          flex: 1
                        }}>
                          {master}
                        </Text>
                      </View>
                    ))}
                  </Card.Content>
                </Card>
                
                <Card style={{ backgroundColor: theme.colors.surfaceVariant }}>
                  <Card.Content>
                    <Text style={{ 
                      fontWeight: 'bold', 
                      marginBottom: 10, 
                      color: theme.colors.onSurface,
                      fontSize: 16
                    }}>
                      本机从设备:
                    </Text>
                    {currentSlaves.map((slave, index) => (
                      <View key={index} style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        marginBottom: 12,
                        padding: 10,
                        backgroundColor: theme.colors.surface,
                        borderRadius: 8
                      }}>
                        <Checkbox.Android
                          status={!removedSlaves.includes(slave) ? 'checked' : 'unchecked'}
                          onPress={() => {
                            setRemovedSlaves(prev => 
                              prev.includes(slave) 
                                ? prev.filter(s => s !== slave) 
                                : [...prev, slave]
                            );
                          }}
                          color={theme.colors.primary}
                        />
                        <Text style={{ 
                          marginLeft: 12, 
                          color: theme.colors.onSurface,
                          flex: 1
                        }}>
                          {slave}
                        </Text>
                      </View>
                    ))}
                  </Card.Content>
                </Card>
              </>
            )}
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              marginTop: 25,
              paddingHorizontal: 10
            }}>
              <Button 
                mode="outlined" 
                onPress={() => setSlaveModalVisible(false)}
                style={{ flex: 1, marginRight: 10, borderRadius: 8 }}
                contentStyle={{ height: 48 }}
              >
                取消
              </Button>
              <Button 
                mode="contained" 
                onPress={saveSlaveModalConfig}
                style={{ flex: 1, borderRadius: 8 }}
                contentStyle={{ height: 48 }}
              >
                保存
              </Button>
            </View>
          </View>
        </ScrollView>
      </Modal>

      {/* 固定在底部的提交按钮 */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.outline,
        elevation: 4
      }}>
        {processingDevices ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={{ marginLeft: 10 }}>正在处理设备配置...</Text>
          </View>
        ) : (
          <Button 
            mode="contained" 
            onPress={handleSubmit}
            style={{ borderRadius: 8 }}
            contentStyle={{ height: 50 }}
            labelStyle={{ fontSize: 16 }}
            disabled={processingDevices}
          >
            保存配置
          </Button>
        )}
      </View>

      {failedDevices.length > 0 && (
        <Modal
          visible={failedDevices.length > 0}
          onDismiss={() => setFailedDevices([])}
          style={{ 
            backgroundColor: theme.colors.background, 
            padding: 20,
            margin: 20,
            borderRadius: 12
          }}>
          <View style={{ padding: 10 }}>
            <Text variant="titleLarge" style={{ color: theme.colors.error, marginBottom: 15 }}>
              配置失败的设备
            </Text>
            {failedDevices.map((device, index) => (
              <Text key={index} style={{ marginBottom: 5 }}>{device}</Text>
            ))}
            <Button 
              mode="contained" 
              onPress={() => setFailedDevices([])}
              style={{ marginTop: 20 }}
            >
              确认
            </Button>
          </View>
        </Modal>
      )}

      {/* Snackbar 提示 */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.primary }}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

export default DeviceConfigPage;
