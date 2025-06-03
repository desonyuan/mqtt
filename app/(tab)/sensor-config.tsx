import BottomPopup, {BottomSheetModal} from '@/components/BottomPopup';
import {ThemedText} from '@/components/ThemedText';
import {ThemedView} from '@/components/ThemedView';
import Search from '@/components/ui/custom/Search';
import {useAuth} from '@/contexts/AuthContext';
import {useThemeColor} from '@/hooks/useThemeColor';
import React, {useMemo, useRef, useState} from 'react';
import {Alert, FlatList, StyleSheet, View} from 'react-native';
import {ActivityIndicator, Button, Card, Chip, Divider, List, ProgressBar, Switch, TextInput} from 'react-native-paper';
import {mock, Random} from 'mockjs';
import {useBoolean} from 'ahooks';
import CardBox from '@/components/ui/custom/CardBox';
import {BottomSheetFooter, BottomSheetScrollView} from '@gorhom/bottom-sheet';

// 嵌入式设备配置接口
interface DeviceConfig {
  id: string;
  name: string;
  uuid: string;
  isActive: boolean;
  soilMoistureThreshold: number; // 土壤湿度浇水阈值（百分比）
  lightThreshold: number; // 光照报警阈值（lux）
  co2Threshold: number; // CO2报警阈值（ppm）
  fireAlarmEnabled: boolean; // 是否启用火灾报警
  lastUpdated: string; // 上次更新时间
}

const data = mock({
  // 属性 list 的值是一个数组，其中含有 1 到 10 个元素
  'list|10-20': [
    {
      // 属性 id 是一个自增数，起始值为 1，每次增 1
      'id|+1': 1,
      name: '@ctitle(4, 7)',
      uuid: Random.id(),
      isActive: Random.boolean(),
      fireAlarmEnabled: Random.boolean(),
      'soilMoistureThreshold|1-100': 1,
      lightThreshold: Random.integer(1000, 10000),
      co2Threshold: Random.integer(0, 800),
      lastUpdated: Random.datetime(),
    },
  ],
});

export default function DeviceConfigScreen() {
  const [devices, setDevices] = useState<DeviceConfig[]>(data.list);
  const [loading, setLoading] = useBoolean();
  const [selectedDevice, setSelectedDevice] = useState<DeviceConfig | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popRef = useRef<BottomSheetModal>(null);

  // 选择设备进行编辑
  const handleSelectDevice = (device: DeviceConfig) => {
    setSelectedDevice(device);
    setEditMode(true);
    popRef.current?.present();
  };

  // 保存设备配置
  const handleSaveConfig = () => {
    if (!selectedDevice) return;

    // 更新上次修改时间
    const updatedDevice = {
      ...selectedDevice,
      lastUpdated: new Date().toLocaleString('zh-CN'),
    };

    setDevices((prev) => prev.map((device) => (device.id === updatedDevice.id ? updatedDevice : device)));

    // 这里应该调用API保存配置
    Alert.alert('成功', '设备配置已保存');
    setEditMode(false);
    setSelectedDevice(null);
  };

  // 格式化阈值显示
  const formatThresholdValue = (value: number, type: string): string => {
    switch (type) {
      case 'soil':
        return `${value}%`;
      case 'light':
        return `${value} lux`;
      case 'co2':
        return `${value} ppm`;
      default:
        return `${value}`;
    }
  };

  const renderEditForm = useMemo(() => {
    if (selectedDevice) {
      const deviceMode = selectedDevice.device_mode || 0;
      const isMasterMode = deviceMode === 0;
      return (
        <>
          <Divider />
          <ThemedText style={styles.sectionTitle}>基本配置</ThemedText>
          <View style={styles.configItem}>
            <ThemedText style={styles.configLabel}>Wi-Fi SSID</ThemedText>
            <TextInput style={styles.configInput} mode="outlined" dense />
          </View>

          <View style={styles.configItem}>
            <ThemedText style={styles.configLabel}>Wi-Fi 密码</ThemedText>
            <TextInput style={styles.configInput} mode="outlined" dense secureTextEntry />
          </View>

          <View style={styles.configItem}>
            <ThemedText style={styles.configLabel}>设备模式</ThemedText>
            <View style={styles.radioButtonGroup}>
              <List.Item
                title="主模式"
                left={(props) => (
                  <List.Icon {...props} icon={deviceMode === 0 ? 'radiobox-marked' : 'radiobox-blank'} />
                )}
                style={styles.radioItem}
                titleStyle={styles.radioItemTitle}
              />
              <List.Item
                title="从模式"
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
                  <Chip key={uuid} style={styles.chip} onClose={() => {}}>
                    {uuid}
                  </Chip>
                ))}
                <Button
                  mode="outlined"
                  onPress={() => {
                    // 这里应该弹出一个对话框来添加从设备UUID
                    const newSlaveUuid = `slave-device-${Date.now().toString().slice(-3)}`;
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
              <TextInput value={selectedDevice.master_uuid || ''} style={styles.configInput} mode="outlined" dense />
            </View>
          )}
          <Divider style={styles.divider} />

          <ThemedText style={styles.sectionTitle}>传感器阈值配置</ThemedText>
        </>
      );
    }
    return null;
  }, [selectedDevice]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <ThemedText style={styles.loadingText}>加载设备配置...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <View style={styles.contentContainer}>
        <Search value={searchQuery} onChangeText={setSearchQuery} placeholder="搜索设备..." />
        <CardBox>
          <FlatList
            showsVerticalScrollIndicator={false}
            data={devices}
            renderItem={({item: device, index}) => {
              return (
                <List.Item
                  title={device.name}
                  description={`UUID: ${device.uuid}\n上次更新: ${device.lastUpdated}`}
                  titleStyle={styles.listItemTitle}
                  descriptionStyle={styles.listItemDescription}
                  descriptionNumberOfLines={2}
                  right={() => (
                    <View style={styles.itemRightContent}>
                      <View style={styles.thresholdContainer}>
                        <ThemedText style={styles.thresholdText}>水: {device.soilMoistureThreshold}%</ThemedText>
                        <ThemedText style={styles.thresholdText}>
                          光: {Math.floor(device.lightThreshold / 1000)}k
                        </ThemedText>
                        <ThemedText style={styles.thresholdText}>CO2: {device.co2Threshold}</ThemedText>
                      </View>
                      <Button
                        mode="contained-tonal"
                        // compact
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
              );
            }}
          />
        </CardBox>
      </View>
      <BottomPopup
        handleIndicatorStyle={{backgroundColor: 'transparent'}}
        ref={popRef}
        snapPoints={['70%']}
        footerComponent={(props) => {
          return (
            <BottomSheetFooter {...props}>
              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    popRef.current?.dismiss();
                  }}
                  // style={styles.cancelButton}
                  labelStyle={styles.buttonLabel}
                >
                  取消
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    popRef.current?.dismiss();
                  }}
                  // style={styles.saveButton}
                  labelStyle={styles.buttonLabel}
                >
                  保存
                </Button>
              </View>
            </BottomSheetFooter>
          );
        }}
        handleComponent={() => {
          const device = selectedDevice;
          if (!device) {
            return null;
          }
          return (
            <View style={styles.deviceHeader}>
              <View>
                <ThemedText style={styles.deviceName}>{device.name}</ThemedText>
                <ThemedText style={styles.deviceUuid}>{device.uuid}</ThemedText>
              </View>
              <Chip
                mode="outlined"
                icon={device.isActive ? 'check-circle' : 'close-circle'}
                onPress={() =>
                  setSelectedDevice({
                    ...device,
                    isActive: !device.isActive,
                  })
                }
                style={[
                  styles.statusChip,
                  {backgroundColor: device.isActive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'},
                ]}
              >
                {device.isActive ? '已启用' : '已禁用'}
              </Chip>
            </View>
          );
        }}
        as="custom"
      >
        <BottomSheetScrollView contentContainerStyle={{padding: 10}}>{renderEditForm}</BottomSheetScrollView>
      </BottomPopup>
    </>
  );
}

const styles = StyleSheet.create({
  sensorList: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  addButton: {
    margin: 4,
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    margin: 4,
  },
  radioItem: {
    paddingVertical: 0,
  },
  radioItemTitle: {
    fontSize: 14,
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
  contentContainer: {
    padding: 10,
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
    paddingHorizontal: 20,
    paddingTop: 20,
    // marginBottom: 16,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Sarasa',
  },
  deviceUuid: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'Sarasa',
  },
  statusChip: {
    height: 30,
  },

  sectionTitle: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 8,
    fontFamily: 'Sarasa',
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
    width: 80,
    marginHorizontal: 8,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'Sarasa',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    // marginTop: 20,
    backgroundColor: 'white',
    paddingVertical: 10,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonLabel: {
    fontSize: 12,
    fontFamily: 'Sarasa',
  },
});
