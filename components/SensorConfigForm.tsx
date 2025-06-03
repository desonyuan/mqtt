import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Switch, TextInput, Button, useTheme, Divider } from 'react-native-paper';
import { ConfigPayload, ThresholdConfig } from '@/proto/config_payload';

// 传感器类型枚举
export enum SensorType {
  SENSOR_SHT4X = 0,     // 温湿度传感器
  SENSOR_TSL2591 = 1,   // 光照传感器
  SENSOR_SCD41 = 2,     // CO2传感器
  SENSOR_MOISTURE = 3,  // 土壤湿度传感器
  SENSOR_COUNT = 4,     // 传感器总数
}

// 传感器名称映射
export const SensorNames: { [key: number]: string } = {
  [SensorType.SENSOR_SHT4X]: '温湿度传感器',
  [SensorType.SENSOR_TSL2591]: '光照传感器',
  [SensorType.SENSOR_SCD41]: 'CO2传感器',
  [SensorType.SENSOR_MOISTURE]: '土壤湿度传感器',
};

// 传感器数据单位映射
export const SensorUnits: { [key: number]: string[] } = {
  [SensorType.SENSOR_SHT4X]: ['°C', '%'],
  [SensorType.SENSOR_TSL2591]: ['lux'],
  [SensorType.SENSOR_SCD41]: ['ppm'],
  [SensorType.SENSOR_MOISTURE]: ['%'],
};

// 设备模式枚举
export enum DeviceMode {
  MODE_MASTER = 0,      // 主设备模式
  MODE_SLAVE = 1,       // 从设备模式
}

// 传感器配置表单组件属性
interface SensorConfigFormProps {
  initialConfig?: ConfigPayload;
  onSubmit: (config: ConfigPayload) => void;
  loading?: boolean;
}

// 传感器配置表单组件
const SensorConfigForm = ({
  initialConfig,
  onSubmit,
  loading = false
}: SensorConfigFormProps) => {
  const theme = useTheme();
  
  // 初始化配置状态
  const [config, setConfig] = useState<ConfigPayload>(initialConfig || {
    deviceUuid: '',
    wifiSsid: '',
    wifiPassword: '',
    deviceMode: DeviceMode.MODE_MASTER,
    slaveUuids: [],
    masterUuid: '',
    thresholds: {},
    pirSensorEnabled: false,
    lightPwmTarget: 0,
    pwmEnabled: false,
  });
  
  // 更新整个配置对象
  const updateConfig = (newValues: Partial<ConfigPayload>) => {
    setConfig({ ...config, ...newValues });
  };
  
  // 更新阈值配置
  const updateThreshold = (sensorType: SensorType, newThreshold: Partial<ThresholdConfig>) => {
    const currentThreshold = config.thresholds[sensorType] || {};
    const updatedThresholds = {
      ...config.thresholds,
      [sensorType]: {
        ...currentThreshold,
        ...newThreshold,
      },
    };
    updateConfig({ thresholds: updatedThresholds });
  };
  
  // 从表单提交
  const handleSubmit = () => {
    onSubmit(config);
  };
  
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>基本设置</Text>
          <Divider style={styles.divider} />
          
          <TextInput
            label="设备 UUID"
            value={config.deviceUuid || ''}
            onChangeText={text => updateConfig({ deviceUuid: text })}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Wi-Fi 名称"
            value={config.wifiSsid || ''}
            onChangeText={text => updateConfig({ wifiSsid: text })}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Wi-Fi 密码"
            value={config.wifiPassword || ''}
            onChangeText={text => updateConfig({ wifiPassword: text })}
            secureTextEntry
            mode="outlined"
            style={styles.input}
          />
          
          <View style={styles.switchContainer}>
            <Text>设备模式</Text>
            <View style={styles.switchRow}>
              <Text style={{ marginRight: 8 }}>从设备</Text>
              <Switch
                value={config.deviceMode === DeviceMode.MODE_MASTER}
                onValueChange={value => 
                  updateConfig({ deviceMode: value ? DeviceMode.MODE_MASTER : DeviceMode.MODE_SLAVE })
                }
              />
              <Text style={{ marginLeft: 8 }}>主设备</Text>
            </View>
          </View>
          
          {config.deviceMode === DeviceMode.MODE_SLAVE && (
            <TextInput
              label="主设备 UUID"
              value={config.masterUuid || ''}
              onChangeText={text => updateConfig({ masterUuid: text })}
              mode="outlined"
              style={styles.input}
            />
          )}
          
          {config.deviceMode === DeviceMode.MODE_MASTER && (
            <>
              <Text variant="bodyMedium" style={styles.fieldLabel}>从设备列表</Text>
              <View style={styles.slaveUuidsContainer}>
                {config.slaveUuids.map((uuid, index) => (
                  <View key={index} style={styles.slaveUuidRow}>
                    <TextInput
                      value={uuid}
                      onChangeText={text => {
                        const updatedSlaveUuids = [...config.slaveUuids];
                        updatedSlaveUuids[index] = text;
                        updateConfig({ slaveUuids: updatedSlaveUuids });
                      }}
                      mode="outlined"
                      style={styles.slaveUuidInput}
                    />
                    <Button
                      mode="text"
                      onPress={() => {
                        const updatedSlaveUuids = [...config.slaveUuids];
                        updatedSlaveUuids.splice(index, 1);
                        updateConfig({ slaveUuids: updatedSlaveUuids });
                      }}
                    >
                      删除
                    </Button>
                  </View>
                ))}
                <Button
                  mode="outlined"
                  onPress={() => updateConfig({ slaveUuids: [...config.slaveUuids, ''] })}
                  style={styles.addButton}
                >
                  添加从设备
                </Button>
              </View>
            </>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>传感器阈值设置</Text>
          <Divider style={styles.divider} />
          
          {Object.values(SensorType).filter(value => typeof value === 'number' && value < SensorType.SENSOR_COUNT).map((sensorType) => {
            const threshold = config.thresholds[Number(sensorType)] || {};
            const sensorName = SensorNames[Number(sensorType)];
            const unit = SensorUnits[Number(sensorType)][0] || '';
            
            return (
              <View key={sensorType} style={styles.thresholdContainer}>
                <Text variant="bodyLarge" style={styles.thresholdTitle}>{sensorName}</Text>
                
                <View style={styles.thresholdRow}>
                  <View style={styles.switchContainer}>
                    <Text>启用上限</Text>
                    <Switch
                      value={threshold.upperEnabled || false}
                      onValueChange={value => 
                        updateThreshold(Number(sensorType), { upperEnabled: value })
                      }
                    />
                  </View>
                  
                  <TextInput
                    label={`上限值 (${unit})`}
                    value={threshold.upperThreshold?.toString() || ''}
                    onChangeText={text => {
                      const value = parseFloat(text);
                      if (!isNaN(value) || text === '') {
                        updateThreshold(Number(sensorType), { 
                          upperThreshold: text === '' ? undefined : value 
                        });
                      }
                    }}
                    keyboardType="numeric"
                    mode="outlined"
                    disabled={!threshold.upperEnabled}
                    style={styles.thresholdInput}
                  />
                </View>
                
                <View style={styles.thresholdRow}>
                  <View style={styles.switchContainer}>
                    <Text>启用下限</Text>
                    <Switch
                      value={threshold.lowerEnabled || false}
                      onValueChange={value => 
                        updateThreshold(Number(sensorType), { lowerEnabled: value })
                      }
                    />
                  </View>
                  
                  <TextInput
                    label={`下限值 (${unit})`}
                    value={threshold.lowerThreshold?.toString() || ''}
                    onChangeText={text => {
                      const value = parseFloat(text);
                      if (!isNaN(value) || text === '') {
                        updateThreshold(Number(sensorType), { 
                          lowerThreshold: text === '' ? undefined : value 
                        });
                      }
                    }}
                    keyboardType="numeric"
                    mode="outlined"
                    disabled={!threshold.lowerEnabled}
                    style={styles.thresholdInput}
                  />
                </View>
                
                <Divider style={[styles.divider, { marginVertical: 12 }]} />
              </View>
            );
          })}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>功能设置</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.switchContainer}>
            <Text>启用人体感应器</Text>
            <Switch
              value={config.pirSensorEnabled || false}
              onValueChange={value => updateConfig({ pirSensorEnabled: value })}
            />
          </View>
          
          <View style={styles.switchContainer}>
            <Text>启用PWM控制</Text>
            <Switch
              value={config.pwmEnabled || false}
              onValueChange={value => updateConfig({ pwmEnabled: value })}
            />
          </View>
          
          <TextInput
            label="光照强度目标值"
            value={config.lightPwmTarget?.toString() || '0'}
            onChangeText={text => {
              const value = parseFloat(text);
              if (!isNaN(value) || text === '') {
                updateConfig({ lightPwmTarget: text === '' ? 0 : value });
              }
            }}
            keyboardType="numeric"
            mode="outlined"
            disabled={!config.pwmEnabled}
            style={styles.input}
          />
        </Card.Content>
      </Card>
      
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
      >
        提交配置
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    marginBottom: 8,
  },
  slaveUuidsContainer: {
    marginBottom: 16,
  },
  slaveUuidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  slaveUuidInput: {
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    marginTop: 8,
  },
  thresholdContainer: {
    marginBottom: 8,
  },
  thresholdTitle: {
    marginBottom: 8,
  },
  thresholdRow: {
    marginBottom: 8,
  },
  thresholdInput: {
    marginTop: 8,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 32,
  },
});

export default SensorConfigForm; 