import React, {useState, useEffect} from 'react';
import {StyleSheet, View, ScrollView, Alert, Platform} from 'react-native';
import {Button, TextInput, Card, Switch, Divider, ActivityIndicator, List, Chip, ProgressBar} from 'react-native-paper';
import {ThemedView} from '@/components/ThemedView';
import {ThemedText} from '@/components/ThemedText';
import {useThemeColor} from '@/hooks/useThemeColor';
import {useAuth} from '@/contexts/AuthContext';
import {router} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// 传感器类型枚举
enum SensorType {
  SENSOR_SHT4X = 0, // 温湿度传感器
  SENSOR_TSL2591 = 1, // 光照传感器
  SENSOR_SCD41 = 2, // CO2传感器
  SENSOR_MOISTURE = 3, // 土壤湿度传感器
}

// 阈值取值类型枚举
enum ThresholdValueType {
  THRESHOLD_VALUE_RAW = 0, // 使用原始传感器值
  THRESHOLD_VALUE_AVERAGE = 1, // 使用滑动窗口平均值
  THRESHOLD_VALUE_MAX = 2, // 使用滑动窗口最大值
}

// 阈值配置接口
interface ThresholdConfig {
  upper_threshold?: number; // 阈值上限
  lower_threshold?: number; // 阈值下限
  upper_enabled?: boolean; // 是否启用上限检测
  lower_enabled?: boolean; // 是否启用下限检测
  data_value_type?: number; // 阈值取值类型
}

// 设备配置接口
interface DeviceConfig {
  device_uuid: string; // 设备UUID
  wifi_ssid?: string; // Wi-Fi SSID
  wifi_password?: string; // Wi-Fi密码
  device_mode?: number; // 设备模式（0: 主模式，1: 从模式）
  slave_uuids?: string[]; // 从设备UUID列表（主模式下生效）
  master_uuid?: string; // 主设备UUID（从模式下生效）
  thresholds: Map<number, ThresholdConfig>; // 传感器阈值配置
  pir_sensor_enabled?: boolean; // 是否启用人感检测
  light_pwm_target?: number; // 灯光PWM目标值
  pwm_enabled?: boolean; // 是否启用PWM控制
  lastUpdated: string; // 上次更新时间
  isActive: boolean; // 设备是否激活
}

// 传感器名称映射
const sensorTypeNames: Record<number, string> = {
  [SensorType.SENSOR_SHT4X]: '温湿度',
  [SensorType.SENSOR_TSL2591]: '光照',
  [SensorType.SENSOR_SCD41]: 'CO2',
  [SensorType.SENSOR_MOISTURE]: '土壤湿度',
};

// 传感器单位映射
const sensorTypeUnits: Record<number, string> = {
  [SensorType.SENSOR_SHT4X]: '°C/%',
  [SensorType.SENSOR_TSL2591]: 'lux',
  [SensorType.SENSOR_SCD41]: 'ppm',
  [SensorType.SENSOR_MOISTURE]: '%',
};

export default function DeviceConfigScreen() {
  const {userRole} = useAuth();
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<DeviceConfig | null>(null);
  const [selectedSensorType, setSelectedSensorType] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingSensor, setEditingSensor] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const insets = useSafeAreaInsets();

  // 选择设备进行编辑
  const handleSelectDevice = (device: DeviceConfig) => {
    // 将Map转换为普通对象进行深拷贝
    const thresholdsObj: Record<number, ThresholdConfig> = {};
    device.thresholds.forEach((value, key) => {
      thresholdsObj[key] = {...value};
    });

    const deviceCopy = {
      ...device,
      slave_uuids: device.slave_uuids ? [...device.slave_uuids] : [],
    };

    // 重新创建Map
    deviceCopy.thresholds = new Map();
    Object.keys(thresholdsObj).forEach((key) => {
      deviceCopy.thresholds.set(Number(key), thresholdsObj[Number(key)]);
    });

    setSelectedDevice(deviceCopy);
    setEditMode(true);
    setEditingSensor(false);
  };

  // 选择传感器进行编辑
  const handleSelectSensor = (sensorType: number) => {
    setSelectedSensorType(sensorType);
    setEditingSensor(true);
  };

  // 保存设备配置
  const handleSaveConfig = () => {
    if (!selectedDevice) return;

    // 更新上次修改时间
    const updatedDevice = {
      ...selectedDevice,
      lastUpdated: new Date().toLocaleString('zh-CN'),
    };

    setDevices((prev) =>
      prev.map((device) => (device.device_uuid === updatedDevice.device_uuid ? updatedDevice : device))
    );

    // 这里应该调用API保存配置
    Alert.alert('成功', '设备配置已保存');
    setEditMode(false);
    setSelectedDevice(null);
  };

  // 保存传感器配置
  const handleSaveSensorConfig = () => {
    if (!selectedDevice || selectedSensorType === null) return;

    setEditingSensor(false);
    setSelectedSensorType(null);
  };

  // 渲染传感器配置编辑表单
  const renderSensorEditForm = () => {
    if (!selectedDevice || selectedSensorType === null) return null;

    const sensorConfig = selectedDevice.thresholds.get(selectedSensorType) || {
      lower_threshold: 0,
      upper_threshold: 100,
      lower_enabled: false,
      upper_enabled: false,
      data_value_type: ThresholdValueType.THRESHOLD_VALUE_RAW,
    };

    const sensorName = sensorTypeNames[selectedSensorType];
    const sensorUnit = sensorTypeUnits[selectedSensorType];

    const updateSensorConfig = (updates: Partial<ThresholdConfig>) => {
      if (!selectedDevice || selectedSensorType === null) return;

      let updatedConfig = {
        ...sensorConfig,
        ...updates,
      };

      // 特殊规则处理
      // 1. 土壤湿度传感器：如果启用下限，必须启用上限
      if (
        selectedSensorType === SensorType.SENSOR_MOISTURE &&
        updates.lower_enabled !== undefined &&
        updates.lower_enabled === true
      ) {
        updatedConfig.upper_enabled = true;
      }

      // 2. 光照传感器上下限与PWM控制互斥
      if (selectedSensorType === SensorType.SENSOR_TSL2591) {
        if (
          (updates.lower_enabled !== undefined && updates.lower_enabled === true) ||
          (updates.upper_enabled !== undefined && updates.upper_enabled === true)
        ) {
          // 如果启用了任一阈值检测，确保PWM被禁用
          if (selectedDevice.pwm_enabled) {
            Alert.alert('配置冲突', '光照传感器阈值与PWM控制无法同时启用，已自动禁用PWM控制');
            const updatedDevice = {...selectedDevice, pwm_enabled: false};
            setSelectedDevice(updatedDevice);
          }
        }
      }

      const updatedDevice = {...selectedDevice};
      updatedDevice.thresholds.set(selectedSensorType, updatedConfig);
      setSelectedDevice(updatedDevice);
    };

    // 判断是否显示额外提示
    const renderExtraHint = () => {
      if (selectedSensorType === SensorType.SENSOR_MOISTURE && sensorConfig.lower_enabled) {
        return (
          <ThemedText style={styles.hintText}>
            注意：土壤湿度传感器开启下限后，上限将自动开启（下限为继电器开启阈值，上限为继电器关闭阈值）
          </ThemedText>
        );
      }

      if (selectedSensorType === SensorType.SENSOR_TSL2591) {
        return <ThemedText style={styles.hintText}>注意：光照传感器阈值与PWM控制无法同时启用</ThemedText>;
      }

      return null;
    };

    return (
      <Card style={[styles.card, {backgroundColor: cardColor}]}>
        <Card.Title title={`${sensorName}传感器配置`} titleStyle={styles.cardTitle} />
        <Card.Content>
          <View style={styles.sensorEditContainer}>
            <ThemedText style={styles.sectionTitle}>阈值配置</ThemedText>

            {renderExtraHint()}

            <View style={styles.thresholdConfigSection}>
              <View style={styles.switchRow}>
                <ThemedText style={styles.switchLabel}>启用下限检测（继电器开启阈值）</ThemedText>
                <Switch
                  value={sensorConfig.lower_enabled || false}
                  onValueChange={(value) => updateSensorConfig({lower_enabled: value})}
                  color="#2196F3"
                />
              </View>

              {sensorConfig.lower_enabled && (
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderValueContainer}>
                    <ThemedText style={styles.sliderLabel}>下限阈值</ThemedText>
                    <TextInput
                      value={(sensorConfig.lower_threshold || 0).toString()}
                      onChangeText={(text) => {
                        const value = parseFloat(text);
                        if (!isNaN(value)) {
                          updateSensorConfig({lower_threshold: value});
                        }
                      }}
                      keyboardType="numeric"
                      style={styles.valueInput}
                      mode="outlined"
                      dense
                      right={<TextInput.Affix text={sensorUnit} />}
                    />
                  </View>
                </View>
              )}

              <View style={styles.switchRow}>
                <ThemedText style={styles.switchLabel}>启用上限检测（继电器关闭阈值）</ThemedText>
                <Switch
                  value={sensorConfig.upper_enabled || false}
                  onValueChange={(value) => updateSensorConfig({upper_enabled: value})}
                  color="#F44336"
                  // 土壤湿度传感器且下限已启用时上限不可禁用
                  disabled={selectedSensorType === SensorType.SENSOR_MOISTURE && sensorConfig.lower_enabled}
                />
              </View>

              {sensorConfig.upper_enabled && (
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderValueContainer}>
                    <ThemedText style={styles.sliderLabel}>上限阈值</ThemedText>
                    <TextInput
                      value={(sensorConfig.upper_threshold || 0).toString()}
                      onChangeText={(text) => {
                        const value = parseFloat(text);
                        if (!isNaN(value)) {
                          updateSensorConfig({upper_threshold: value});
                        }
                      }}
                      keyboardType="numeric"
                      style={styles.valueInput}
                      mode="outlined"
                      dense
                      right={<TextInput.Affix text={sensorUnit} />}
                    />
                  </View>
                </View>
              )}
            </View>

            <ThemedText style={styles.sectionTitle}>数据取值类型</ThemedText>
            <View style={styles.valueTypeContainer}>
              <List.Item
                title="原始传感器值"
                onPress={() => updateSensorConfig({data_value_type: ThresholdValueType.THRESHOLD_VALUE_RAW})}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={
                      sensorConfig.data_value_type === ThresholdValueType.THRESHOLD_VALUE_RAW
                        ? 'radiobox-marked'
                        : 'radiobox-blank'
                    }
                  />
                )}
              />
              <List.Item
                title="滑动窗口平均值"
                onPress={() => updateSensorConfig({data_value_type: ThresholdValueType.THRESHOLD_VALUE_AVERAGE})}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={
                      sensorConfig.data_value_type === ThresholdValueType.THRESHOLD_VALUE_AVERAGE
                        ? 'radiobox-marked'
                        : 'radiobox-blank'
                    }
                  />
                )}
              />
              <List.Item
                title="滑动窗口最大值"
                onPress={() => updateSensorConfig({data_value_type: ThresholdValueType.THRESHOLD_VALUE_MAX})}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={
                      sensorConfig.data_value_type === ThresholdValueType.THRESHOLD_VALUE_MAX
                        ? 'radiobox-marked'
                        : 'radiobox-blank'
                    }
                  />
                )}
              />
            </View>

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={() => {
                  setEditingSensor(false);
                  setSelectedSensorType(null);
                }}
                style={styles.cancelButton}
                labelStyle={styles.buttonLabel}
              >
                返回
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveSensorConfig}
                style={styles.saveButton}
                labelStyle={styles.buttonLabel}
              >
                保存
              </Button>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // 渲染编辑表单
  const renderEditForm = () => {
    if (!selectedDevice) return null;

    if (editingSensor) {
      return renderSensorEditForm();
    }

    const deviceMode = selectedDevice.device_mode || 0;
    const isMasterMode = deviceMode === 0;

    return (
      <Card style={[styles.card, {backgroundColor: cardColor}]}>
        <Card.Title title="编辑设备配置" titleStyle={styles.cardTitle} />
        <Card.Content>
          <View style={styles.deviceHeader}>
            <View>
              <ThemedText style={styles.deviceUuid}>UUID: {selectedDevice.device_uuid}</ThemedText>
            </View>
            <Chip
              mode="outlined"
              icon={selectedDevice.isActive ? 'check-circle' : 'close-circle'}
              onPress={() =>
                setSelectedDevice({
                  ...selectedDevice,
                  isActive: !selectedDevice.isActive,
                })
              }
              style={[
                styles.statusChip,
                {backgroundColor: selectedDevice.isActive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'},
              ]}
            >
              {selectedDevice.isActive ? '已启用' : '已禁用'}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          <ThemedText style={styles.sectionTitle}>基本配置</ThemedText>

          <View style={styles.configItem}>
            <ThemedText style={styles.configLabel}>Wi-Fi SSID</ThemedText>
            <TextInput
              value={selectedDevice.wifi_ssid || ''}
              onChangeText={(text) =>
                setSelectedDevice({
                  ...selectedDevice,
                  wifi_ssid: text,
                })
              }
              style={styles.configInput}
              mode="outlined"
              dense
            />
          </View>

          <View style={styles.configItem}>
            <ThemedText style={styles.configLabel}>Wi-Fi 密码</ThemedText>
            <TextInput
              value={selectedDevice.wifi_password || ''}
              onChangeText={(text) =>
                setSelectedDevice({
                  ...selectedDevice,
                  wifi_password: text,
                })
              }
              style={styles.configInput}
              mode="outlined"
              dense
              secureTextEntry
            />
          </View>
          {/*  */}
          <View style={styles.configItem}>
            <ThemedText style={styles.configLabel}>设备模式</ThemedText>
            <View style={styles.radioButtonGroup}>
              <List.Item
                title="主模式"
                onPress={() =>
                  setSelectedDevice({
                    ...selectedDevice,
                    device_mode: 0,
                  })
                }
                left={(props) => (
                  <List.Icon {...props} icon={deviceMode === 0 ? 'radiobox-marked' : 'radiobox-blank'} />
                )}
                style={styles.radioItem}
                titleStyle={styles.radioItemTitle}
              />
              <List.Item
                title="从模式"
                onPress={() =>
                  setSelectedDevice({
                    ...selectedDevice,
                    device_mode: 1,
                  })
                }
                left={(props) => (
                  <List.Icon {...props} icon={deviceMode === 1 ? 'radiobox-marked' : 'radiobox-blank'} />
                )}
                style={styles.radioItem}
                titleStyle={styles.radioItemTitle}
              />
            </View>
          </View>

          {/* 仅主模式下显示从设备列表 */}
          {isMasterMode && (
            <View style={styles.configItem}>
              <ThemedText style={styles.configLabel}>从设备列表</ThemedText>
              <View style={styles.chipList}>
                {(selectedDevice.slave_uuids || []).map((uuid, index) => (
                  <Chip
                    key={uuid}
                    style={styles.chip}
                    onClose={() => {
                      const updatedSlaveUuids = [...(selectedDevice.slave_uuids || [])];
                      updatedSlaveUuids.splice(index, 1);
                      setSelectedDevice({
                        ...selectedDevice,
                        slave_uuids: updatedSlaveUuids,
                      });
                    }}
                  >
                    {uuid}
                  </Chip>
                ))}
                <Button
                  mode="outlined"
                  onPress={() => {
                    // 这里应该弹出一个对话框来添加从设备UUID
                    const newSlaveUuid = `slave-device-${Date.now().toString().slice(-3)}`;
                    setSelectedDevice({
                      ...selectedDevice,
                      slave_uuids: [...(selectedDevice.slave_uuids || []), newSlaveUuid],
                    });
                  }}
                  style={styles.addButton}
                >
                  添加从设备
                </Button>
              </View>
            </View>
          )}

          {/* 仅从模式下显示主设备UUID */}
          {!isMasterMode && (
            <View style={styles.configItem}>
              <ThemedText style={styles.configLabel}>主设备UUID</ThemedText>
              <TextInput
                value={selectedDevice.master_uuid || ''}
                onChangeText={(text) =>
                  setSelectedDevice({
                    ...selectedDevice,
                    master_uuid: text,
                  })
                }
                style={styles.configInput}
                mode="outlined"
                dense
              />
            </View>
          )}

          <Divider style={styles.divider} />

          <ThemedText style={styles.sectionTitle}>传感器阈值配置</ThemedText>

          <View style={styles.sensorList}>
            {Array.from(selectedDevice.thresholds.keys()).map((sensorType) => {
              const sensorConfig = selectedDevice.thresholds.get(sensorType);
              if (!sensorConfig) return null;

              return (
                <List.Item
                  key={sensorType}
                  title={sensorTypeNames[sensorType]}
                  description={() => {
                    const descriptions = [];
                    if (sensorConfig.lower_enabled && sensorConfig.lower_threshold !== undefined) {
                      descriptions.push(`下限: ${sensorConfig.lower_threshold}${sensorTypeUnits[sensorType]}`);
                    }
                    if (sensorConfig.upper_enabled && sensorConfig.upper_threshold !== undefined) {
                      descriptions.push(`上限: ${sensorConfig.upper_threshold}${sensorTypeUnits[sensorType]}`);
                    }
                    return <ThemedText>{descriptions.join(' | ')}</ThemedText>;
                  }}
                  onPress={() => handleSelectSensor(sensorType)}
                  right={(props) => (
                    <Button
                      mode="contained"
                      onPress={() => handleSelectSensor(sensorType)}
                      style={styles.editButton}
                      labelStyle={styles.editButtonLabel}
                    >
                      配置
                    </Button>
                  )}
                />
              );
            })}

            <Button
              mode="outlined"
              onPress={() => {
                // 查找未配置的传感器类型
                const configuredSensors = Array.from(selectedDevice.thresholds.keys());
                const availableSensorTypes = Object.values(SensorType).filter(
                  (value) => typeof value === 'number' && !configuredSensors.includes(value)
                );

                if (availableSensorTypes.length > 0) {
                  // 添加一个新的传感器配置
                  const newSensorType = availableSensorTypes[0] as number;
                  const updatedDevice = {...selectedDevice};
                  updatedDevice.thresholds.set(newSensorType, {
                    lower_threshold: 0,
                    upper_threshold: 100,
                    lower_enabled: false,
                    upper_enabled: false,
                    data_value_type: ThresholdValueType.THRESHOLD_VALUE_RAW,
                  });

                  setSelectedDevice(updatedDevice);
                  handleSelectSensor(newSensorType);
                } else {
                  Alert.alert('提示', '已配置所有可用传感器');
                }
              }}
              style={styles.addSensorButton}
            >
              添加传感器配置
            </Button>
          </View>

          <Divider style={styles.divider} />

          <ThemedText style={styles.sectionTitle}>其他配置</ThemedText>

          <View style={styles.switchRow}>
            <ThemedText style={styles.switchLabel}>启用人感检测</ThemedText>
            <Switch
              value={selectedDevice.pir_sensor_enabled || false}
              onValueChange={() =>
                setSelectedDevice({
                  ...selectedDevice,
                  pir_sensor_enabled: !(selectedDevice.pir_sensor_enabled || false),
                })
              }
              color="#4CAF50"
            />
          </View>

          <View style={styles.switchRow}>
            <ThemedText style={styles.switchLabel}>启用PWM控制</ThemedText>
            <Switch
              value={selectedDevice.pwm_enabled || false}
              onValueChange={() => {
                // 检查是否有光照传感器阈值启用，如果有就提示并阻止开启PWM
                const lightSensorConfig = selectedDevice.thresholds.get(SensorType.SENSOR_TSL2591);
                if (
                  lightSensorConfig &&
                  (lightSensorConfig.lower_enabled || lightSensorConfig.upper_enabled) &&
                  !selectedDevice.pwm_enabled
                ) {
                  Alert.alert('配置冲突', '光照传感器阈值已启用，无法开启PWM控制。请先禁用光照传感器阈值。');
                  return;
                }
                setSelectedDevice({
                  ...selectedDevice,
                  pwm_enabled: !(selectedDevice.pwm_enabled || false),
                });
              }}
              color="#2196F3"
            />
          </View>

          {selectedDevice.pwm_enabled && (
            <View style={styles.sliderContainer}>
              <View style={styles.sliderRow}>
                <Button
                  mode="text"
                  onPress={() => {
                    const newValue = Math.max(0, (selectedDevice.light_pwm_target || 0) - 5);
                    setSelectedDevice({
                      ...selectedDevice,
                      light_pwm_target: newValue,
                    });
                  }}
                >
                  -
                </Button>

                <View style={styles.progressBarContainer}>
                  <ProgressBar
                    progress={(selectedDevice.light_pwm_target || 0) / 100}
                    color="#FF9800"
                    style={styles.progressBar}
                  />
                </View>

                <Button
                  mode="text"
                  onPress={() => {
                    const newValue = Math.min(100, (selectedDevice.light_pwm_target || 0) + 5);
                    setSelectedDevice({
                      ...selectedDevice,
                      light_pwm_target: newValue,
                    });
                  }}
                >
                  +
                </Button>
              </View>

              <View style={styles.sliderValueContainer}>
                <ThemedText style={styles.sliderLabel}>灯光PWM目标值</ThemedText>
                <TextInput
                  value={selectedDevice.light_pwm_target?.toString() || '0'}
                  onChangeText={(text) => {
                    const value = parseFloat(text);
                    if (!isNaN(value) && value >= 0 && value <= 100) {
                      setSelectedDevice({
                        ...selectedDevice,
                        light_pwm_target: value,
                      });
                    }
                  }}
                  keyboardType="numeric"
                  style={styles.valueInput}
                  mode="outlined"
                  dense
                  right={<TextInput.Affix text="%" />}
                />
              </View>
            </View>
          )}

          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={() => {
                setEditMode(false);
                setSelectedDevice(null);
              }}
              style={styles.cancelButton}
              labelStyle={styles.buttonLabel}
            >
              取消
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveConfig}
              style={styles.saveButton}
              labelStyle={styles.buttonLabel}
            >
              保存
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // 渲染设备列表
  const renderDeviceList = () => {
    return (
      <Card style={[styles.card, {backgroundColor: cardColor}]}>
        <Card.Title title="嵌入式设备列表" titleStyle={styles.cardTitle} />
        <Card.Content>
          {devices.map((device) => (
            <List.Item
              key={device.device_uuid}
              title={`UUID: ${device.device_uuid}`}
              description={`模式: ${device.device_mode === 0 ? '主模式' : '从模式'}\n上次更新: ${device.lastUpdated}`}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDescription}
              descriptionNumberOfLines={2}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={device.isActive ? 'check-circle' : 'close-circle'}
                  color={device.isActive ? '#4CAF50' : '#F44336'}
                />
              )}
              right={(props) => (
                <View style={styles.itemRightContent}>
                  <View style={styles.thresholdContainer}>
                    {Array.from(device.thresholds.keys()).map((sensorType) => (
                      <ThemedText key={sensorType} style={styles.thresholdText}>
                        {sensorTypeNames[sensorType]}
                      </ThemedText>
                    ))}
                  </View>
                  <Button
                    mode="contained"
                    compact
                    onPress={() => handleSelectDevice(device)}
                    style={styles.editButton}
                    labelStyle={styles.editButtonLabel}
                  >
                    配置
                  </Button>
                </View>
              )}
              onPress={() => handleSelectDevice(device)}
              style={styles.listItem}
            />
          ))}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <ThemedText style={styles.loadingText}>加载设备配置...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, {paddingTop: insets.top}]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText style={styles.header}>嵌入式设备配置</ThemedText>

        {editMode ? renderEditForm() : renderDeviceList()}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Sarasa',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Sarasa',
  },
  card: {
    marginBottom: 20,
    borderRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontFamily: 'Sarasa',
  },
  listItem: {
    marginVertical: 4,
    borderRadius: 8,
  },
  listItemTitle: {
    fontFamily: 'Sarasa',
    fontSize: 16,
  },
  listItemDescription: {
    fontFamily: 'Sarasa',
    fontSize: 12,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceUuid: {
    fontSize: 16,
    fontFamily: 'Sarasa',
  },
  statusChip: {
    height: 30,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 8,
    fontFamily: 'Sarasa',
    fontWeight: 'bold',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  sliderValueContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 14,
    fontFamily: 'Sarasa',
  },
  valueInput: {
    height: 30,
    width: 100,
    marginHorizontal: 8,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'Sarasa',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  buttonLabel: {
    fontFamily: 'Sarasa',
  },
  saveButton: {
    flex: 1,
    marginLeft: 10,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
  },
  itemRightContent: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  thresholdContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  thresholdText: {
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.7,
    fontFamily: 'Sarasa',
  },
  editButton: {
    borderRadius: 4,
    paddingVertical: 2,
  },
  editButtonLabel: {
    fontSize: 12,
    fontFamily: 'Sarasa',
  },
  configItem: {
    marginBottom: 16,
  },
  configLabel: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'Sarasa',
  },
  configInput: {
    backgroundColor: 'transparent',
  },
  radioButtonGroup: {
    marginTop: 4,
  },
  radioItem: {
    paddingVertical: 0,
  },
  radioItemTitle: {
    fontSize: 14,
    fontFamily: 'Sarasa',
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    margin: 4,
  },
  addButton: {
    margin: 4,
  },
  sensorList: {
    marginTop: 8,
  },
  addSensorButton: {
    marginTop: 8,
  },
  sensorEditContainer: {
    padding: 8,
  },
  thresholdConfigSection: {
    marginBottom: 16,
  },
  valueTypeContainer: {
    marginVertical: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#FF9800',
    marginBottom: 12,
    fontFamily: 'Sarasa',
    fontStyle: 'italic',
  },
});
