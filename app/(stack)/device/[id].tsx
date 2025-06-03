import DeviceChart from '@/components/screen/device/DeviceChart';
import DeviceList from '@/components/screen/device/DeviceList';
import DeviceLog from '@/components/screen/device/DeviceLog';
import DeviceTable from '@/components/screen/device/DeviceTable';
import {ThemedView} from '@/components/ThemedView';
import {useAuth} from '@/contexts/AuthContext';
import { type Data } from '@/proto/data_payload_pb';
import deviceApi, {DeviceOnlineStatus, MasterSlaveRelation} from '@/services/deviceApi';
import mqttService from '@/services/mqtt';
import {useLocalSearchParams} from 'expo-router';
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
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
  time?: number;
}

type TabItem = 'chart' | 'table' | 'list' | 'log';
export default function DeviceScreen() {
  const {id,time} = useLocalSearchParams();
  const deviceId = Array.isArray(id) ? id[0] : id;
  const numericTime = time ? parseInt(Array.isArray(time) ? time[0] : time, 10) : 0;

  const {userRole} = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [slaveDevices, setSlaveDevices] = useState<DeviceOnlineStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabItem>('chart');
  const [mqttInitialized, setMqttInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

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
          owner_uuid: currentDeviceRelation.device_uuid, // 添加所有者UUID
        }));
        console.log(slaveDeviceStatuses, 'slaveDeviceStatusesslaveDeviceStatusesslaveDeviceStatuses');

        setSlaveDevices(slaveDeviceStatuses);
      }
    } catch (error) {
      console.error('获取从设备失败:', error);
      setError('获取从设备信息失败');
    }
  };

  // 刷新设备数据
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSlaveDevices();
    setRefreshing(false);
  };

  // 初始化加载
  useEffect(() => {
    const initializeData = async () => {
      setError(null);
      setLoading(true);
      setMqttInitialized(false);

      try {
        // 确保MQTT连接已经初始化
        await mqttService.connect();
        setMqttInitialized(true);

        // 获取从设备列表
        await fetchSlaveDevices();
      } catch (error) {
        console.error('初始化失败:', error);
        setError('加载数据失败，请检查网络连接');
      } finally {
        setLoading(false);
      }
    };

    if (deviceId) {
      initializeData();
    }

    // 组件卸载时断开MQTT连接
    return () => {
      mqttService.disconnect();
    };
  }, [deviceId]);

  const renderContent = useMemo(() => {
    if (!mqttInitialized) return null;
    
    switch (tab) {
      case 'chart':
        return <DeviceChart deviceId={deviceId} time={numericTime} />;
      case 'table':
        return <DeviceTable />;
      case 'log':
        return <DeviceTable />;
      default:
        return <DeviceList />;
    }
  }, [tab, deviceId, mqttInitialized, numericTime]);

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

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>正在初始化MQTT连接...</Text>
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
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    marginTop: 10,
  },
});
