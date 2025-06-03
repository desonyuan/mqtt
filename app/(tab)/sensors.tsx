import {ThemedView} from '@/components/ThemedView';
import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import Search from '@/components/ui/custom/Search';
import {useAuth} from '@/contexts/AuthContext';
import {Data, DataPayload} from '@/proto/data_payload';
import {api} from '@/services/api';
import deviceApi, {DeviceOnlineStatus, MasterSlaveRelation} from '@/services/deviceApi';
import mqttService from '@/services/mqtt';
import {$dayjs} from '@/utils/dayjs';
import {useRequest} from 'ahooks';
import {useLocalSearchParams, useRouter} from 'expo-router';
import React, {useEffect, useState} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {ActivityIndicator, Button, List, Text, useTheme} from 'react-native-paper';

enum UserRole {
  ADMIN = 'admin',
  SENIOR = 'senior',
  NORMAL = 'normal',
}
interface MainDevice {
  device_uuid: string;
  is_online: boolean;
  owner_uuid: string;
  time?: string;
}

type TabItem = 'chart' | 'table' | 'list';
export default function DeviceScreen() {
  const {id} = useLocalSearchParams();
  const deviceId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const theme = useTheme();
  const {userRole} = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [masterSensorData, setMasterSensorData] = useState<Data | null>(null);
  const [slaveDevices, setSlaveDevices] = useState<DeviceOnlineStatus[]>([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabItem>('list');
  // const [mainDevices, setMainDevices] = useState<MainDevice[]>([]);
  //  获取设备列表
  const {data: masterDevices, loading} = useRequest(async () => {
    const res = await api.get('/device');
    return res.data as MainDevice[];
  }, {});
  // 获取设备的从设备列表
  const fetchSlaveDevices = async () => {
    try {
      let masterSlaveRelations: MasterSlaveRelation[] = [];

      if (userRole === UserRole.ADMIN) {
        // 管理员暂不支持批量获取主从关系
        return;
      } else if (userRole === UserRole.SENIOR) {
        // 高级用户: 获取自己的所有主从关系
        masterSlaveRelations = await deviceApi.getMasterSlavesRelation();
      } else {
        // 普通用户: 获取所属高级用户的所有主从关系
        masterSlaveRelations = await deviceApi.getSeniorMasterSlavesRelation();
      }

      // 查找当前设备的从设备
      const currentDeviceRelation = masterSlaveRelations.find((relation) => relation.device_uuid === deviceId);

      if (currentDeviceRelation) {
        // 为每个从设备创建一个状态对象，默认离线
        const slaveDeviceStatuses: DeviceOnlineStatus[] = currentDeviceRelation.slave_device_uuid.map((uuid) => ({
          device_uuid: uuid,
          is_online: false, // 默认为离线
          time: new Date().toISOString(), // 当前时间作为默认值
        }));
        console.log(slaveDeviceStatuses, 'slaveDeviceStatusesslaveDeviceStatusesslaveDeviceStatuses');

        setSlaveDevices(slaveDeviceStatuses);
      }
    } catch (error) {
      console.error('获取从设备失败:', error);
      setError('获取从设备信息失败');
    }
  };

  // 处理MQTT传感器数据
  const handleSensorData = (payload: DataPayload) => {
    if (!payload.datasets || payload.datasets.length === 0) {
      return;
    }

    // 查找当前设备的数据
    const deviceData = payload.datasets.find((data) => data.deviceUuid === deviceId);
    if (deviceData) {
      setMasterSensorData(deviceData);
    }
  };

  // 订阅MQTT主题
  const subscribeMqtt = () => {
    // 订阅设备数据主题
    mqttService.subscribeDeviceData(deviceId, handleSensorData);
  };

  // 刷新设备数据
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSlaveDevices();
    // 重新订阅MQTT主题
    subscribeMqtt();
    setRefreshing(false);
  };

  // 打开设备配置对话框
  const handleOpenConfig = () => {
    setShowConfigDialog(true);
  };

  // 前往设备配置页面
  const handleGoToConfig = () => {
    setShowConfigDialog(false);
    router.push(`/device-config/${deviceId}`);
  };

  // 初始化加载
  useEffect(() => {
    const initializeData = async () => {
      setError(null);

      try {
        // 确保MQTT连接已经初始化
        await mqttService.connect();

        // 获取从设备列表
        await fetchSlaveDevices();

        // 订阅MQTT主题
        subscribeMqtt();
      } catch (error) {
        console.error('初始化失败:', error);
        setError('加载数据失败，请检查网络连接');
      } finally {
        // setLoading(false);
      }
    };

    initializeData();

    // 组件卸载时取消MQTT订阅
    return () => {
      mqttService.unsubscribe(mqttService.getDataTopic(deviceId));
    };
  }, [deviceId]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{marginTop: 20}}>加载设备数据...</Text>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Text>{error}</Text>
        <Button mode="contained" onPress={handleRefresh} style={{marginTop: 16}}>
          重试
        </Button>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        <Search value={searchQuery} onChangeText={setSearchQuery} placeholder="请输入主设备id" />
        <CardBox
          footerComponent={
            // 分页
            <Pagination
              page={1}
              onPageChange={() => {}}
              total={1}
              label={`第${1}页，共${1}页`}
              numberOfItemsPerPageList={2}
              onSubmitEditing={() => {}}
            />
          }
        >
          <FlatList
            data={masterDevices}
            contentContainerStyle={{
              paddingVertical: 10,
            }}
            renderItem={({item: device, index}) => {
              const dotColor = device.is_online ? '#4CAF50' : '#9E9E9E';
              const isEvent = index % 2 === 0;
              return (
                <List.Item
                  onPress={() => {
                    // popRef.current?.present();
                    router.navigate(`/(stack)/device/${device.device_uuid}`);
                  }}
                  style={{
                    backgroundColor: isEvent ? '#eee' : 'transparent',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                  title={device.device_uuid}
                  description={`最后活跃: ${device.time ?? $dayjs().format('YYYY/MM/DD HH:mm:ss')}`}
                  titleStyle={styles.listItemTitle}
                  descriptionStyle={styles.listItemDescription}
                  descriptionNumberOfLines={2}
                  right={() => (
                    <View style={styles.itemRightContent}>
                      <View>
                        <Text>在线状态:</Text>
                      </View>
                      <View style={[styles.dot, {backgroundColor: dotColor}]}></View>
                    </View>
                  )}
                  // onPress={() => handleSelectDevice(device)}
                />
              );
            }}
          />
        </CardBox>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    alignItems: 'center',
    paddingBottom: 15,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  itemRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  listItemTitle: {
    fontFamily: 'Sarasa',
    fontSize: 16,
  },
  listItemDescription: {
    fontFamily: 'Sarasa',
    fontSize: 12,
  },
  container: {
    flex: 1,
    padding: 10,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  noDataCard: {
    marginBottom: 16,
  },
  noDataContent: {
    alignItems: 'center',
    padding: 16,
  },
  slaveDevicesSection: {
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
});
