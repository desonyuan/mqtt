import DeviceChart from '@/components/screen/device/DeviceChart';
import DeviceList from '@/components/screen/device/DeviceList';
import DeviceLog from '@/components/screen/device/DeviceLog';
import DeviceTable from '@/components/screen/device/DeviceTable';
import {ThemedView} from '@/components/ThemedView';
import {useAuth} from '@/contexts/AuthContext';
import {Data, DataPayload} from '@/proto/data_payload';
import deviceApi, {DeviceOnlineStatus, MasterSlaveRelation} from '@/services/deviceApi';
import mqttService from '@/services/mqtt';
import {useLocalSearchParams} from 'expo-router';
import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Text, ToggleButton} from 'react-native-paper';

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

type TabItem = 'chart' | 'table' | 'list' | 'log';
export default function DeviceScreen() {
  const {id} = useLocalSearchParams();
  const deviceId = Array.isArray(id) ? id[0] : id;

  const {userRole} = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [masterSensorData, setMasterSensorData] = useState<Data | null>(null);
  const [slaveDevices, setSlaveDevices] = useState<DeviceOnlineStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabItem>('chart');

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

  const renderContent = useMemo(() => {
    switch (tab) {
      case 'chart':
        return <DeviceChart />;
      case 'table':
        return <DeviceTable />;
      case 'log':
        return <DeviceLog />;
      default:
        return <DeviceList />;
    }
  }, [tab]);

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
      <View style={styles.buttonGroup}>
        <ToggleButton.Row onValueChange={(val) => setTab(val as TabItem)} value={tab}>
          <ToggleButton icon="chart-bar" value="chart" />
          <ToggleButton icon="table" value="table" />
          <ToggleButton icon="math-log" value="log" />
          <ToggleButton icon="format-list-text" value="list" />
        </ToggleButton.Row>
      </View>
      {renderContent}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    alignItems: 'center',
    paddingBottom: 15,
  },

  container: {
    flex: 1,
    padding: 10,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});
