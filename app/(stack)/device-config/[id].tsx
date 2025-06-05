import { View, ScrollView, TextInput, Switch, Modal } from 'react-native';
import { Button, Card, Text, useTheme, Menu, Divider, Checkbox } from 'react-native-paper';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

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
interface ConfigPayload {
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
  
  // 模拟数据填充
  const [config, setConfig] = useState<ConfigPayload>({
    device_uuid: 'DEV-1234567890',
    wifi_ssid: 'MyHomeWiFi',
    wifi_password: 'securepassword',
    device_mode: DeviceMode.MASTER,
    slave_uuids: ['SLAVE-001', 'SLAVE-002'],
    master_uuid: 'MASTER-001',
    pir_sensor_enabled: true,
    light_pwm_target: 75,
    pwm_enabled: true,
    thresholds: new Map([
      [SensorType.SHT4X, { 
        upper_threshold: 30, 
        lower_threshold: 10, 
        upper_enabled: true, 
        lower_enabled: true, 
        data_value_type: ThresholdValueType.AVERAGE 
      }],
      [SensorType.TSL2591, { 
        upper_threshold: 500, 
        lower_threshold: 100, 
        upper_enabled: false, 
        lower_enabled: true, 
        data_value_type: ThresholdValueType.RAW 
      }],
      [SensorType.SCD41, { 
        upper_threshold: 1000, 
        lower_threshold: 400, 
        upper_enabled: true, 
        lower_enabled: true, 
        data_value_type: ThresholdValueType.MAX 
      }],
      [SensorType.MOISTURE, { 
        upper_threshold: 80, 
        lower_threshold: 30, 
        upper_enabled: true, 
        lower_enabled: true, 
        data_value_type: ThresholdValueType.AVERAGE 
      }]
    ]),
  });

  // 从设备管理状态
  const [slaveModalVisible, setSlaveModalVisible] = useState(false);
  const [onlineMasters, setOnlineMasters] = useState<string[]>([
    'MASTER-001', 'MASTER-002', 'MASTER-003'
  ]);
  
  // 四个列表状态
  const [selectedMasters, setSelectedMasters] = useState<string[]>([]);
  const [currentSlaves, setCurrentSlaves] = useState<string[]>(config.slave_uuids);
  const [removedSlaves, setRemovedSlaves] = useState<string[]>([]);
  
  // 菜单可见状态
  const [visibleMenu, setVisibleMenu] = useState<{[key: number]: boolean}>({});

  // 处理表单提交
  const handleSubmit = () => {
    // 最终保存时合并设备列表
    const newSlaves = [
      ...selectedMasters,
      ...currentSlaves.filter(slave => !removedSlaves.includes(slave))
    ];
    
    const finalConfig = {
      ...config,
      slave_uuids: newSlaves
    };
    
    console.log('保存配置:', finalConfig);
    // 这里可以添加提交逻辑
  };

  // 更新阈值配置
  const updateThreshold = (sensorType: SensorType, field: keyof ThresholdConfig, value: any) => {
    setConfig(prev => {
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

  // 渲染阈值配置部分
  const renderThresholdConfig = (sensorType: SensorType, sensorName: string) => {
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
        <Button 
          mode="contained" 
          onPress={handleSubmit}
          style={{ borderRadius: 8 }}
          contentStyle={{ height: 50 }}
          labelStyle={{ fontSize: 16 }}
        >
          保存配置
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default DeviceConfigPage;
