import React, { useEffect, useState } from 'react';
import { StyleSheet, View, RefreshControl, ScrollView } from 'react-native';
import { Text, ActivityIndicator, FAB, useTheme, Button, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import DeviceList from '@/components/DeviceList';
import deviceApi, { DeviceOnlineStatus } from '@/services/deviceApi';
import mqttService from '@/services/mqtt';

enum UserRole {
  ADMIN = 'admin',
  SENIOR = 'senior',
  NORMAL = 'normal',
}

export default function DevicesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState<DeviceOnlineStatus[]>([]);
  const [seniorUuid, setSeniorUuid] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'online' | 'offline'

  // 获取设备列表
  const fetchDevices = async () => {
    try {
      setHasError(false);
      let deviceList: DeviceOnlineStatus[] = [];

      if (userRole === UserRole.ADMIN) {
        // 管理员: 暂时不支持获取所有设备的在线状态，需要选择特定高级用户
        if (seniorUuid) {
          deviceList = await deviceApi.getOnlineDevicesForSenior(seniorUuid);
        }
      } else if (userRole === UserRole.SENIOR) {
        // 高级用户: 获取自己的主设备
        deviceList = await deviceApi.getOnlineMasterDevices();
      } else {
        // 普通用户: 获取所属高级用户的主设备
        try {
          deviceList = await deviceApi.getSeniorMasterDevices().then(async (deviceUuids) => {
            // 为每个设备UUID创建一个状态对象，默认离线
            const defaultDevices: DeviceOnlineStatus[] = deviceUuids.map(uuid => ({
              device_uuid: uuid,
              is_online: false,
              time: new Date().toISOString()
            }));
            return defaultDevices;
          });
        } catch (error) {
          console.error('获取设备失败:', error);
          setHasError(true);
          return [];
        }
      }

      // 应用过滤器
      if (filter === 'online') {
        deviceList = deviceList.filter(device => device.is_online);
      } else if (filter === 'offline') {
        deviceList = deviceList.filter(device => !device.is_online);
      }

      setDevices(deviceList);
      return deviceList;
    } catch (error) {
      console.error('获取设备失败:', error);
      setHasError(true);
      return [];
    }
  };

  // 刷新设备列表
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDevices();
    setRefreshing(false);
  };

  // 处理设备点击事件
  const handleDevicePress = (deviceUuid: string) => {
    router.push(`/device/${deviceUuid}`);
  };

  // 处理添加设备
  const handleAddDevice = () => {
    router.push('/register-device');
  };

  // 初始化加载
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      // 初始化MQTT连接
      //await mqttService.connect();
      // 获取设备列表
      await fetchDevices();
      setLoading(false);
    };

    initializeData();

    // 组件卸载时断开MQTT连接
    return () => {
      //mqttService.disconnect();
    };
  }, [userRole, seniorUuid, filter]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 20 }}>正在加载设备列表...</Text>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text variant="headlineMedium">设备列表</Text>
        </View>

        <View style={styles.filterContainer}>
          <SegmentedButtons
            value={filter}
            onValueChange={setFilter}
            buttons={[
              { value: 'all', label: '全部' },
              { value: 'online', label: '在线' },
              { value: 'offline', label: '离线' },
            ]}
          />
        </View>

        {hasError ? (
          <View style={styles.errorContainer}>
            <Text>获取设备列表失败</Text>
            <Button mode="contained" onPress={handleRefresh} style={{ marginTop: 16 }}>
              重试
            </Button>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <DeviceList 
              devices={devices} 
              onDevicePress={handleDevicePress}
              emptyMessage={
                filter === 'all' 
                  ? "没有设备"
                  : filter === 'online' 
                    ? "没有在线设备" 
                    : "没有离线设备"
              }
            />
          </ScrollView>
        )}

        {/* 只有高级用户和管理员可以添加设备 */}
        {(userRole === UserRole.SENIOR || userRole === UserRole.ADMIN) && (
          <FAB
            icon="plus"
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            onPress={handleAddDevice}
            color={theme.colors.onPrimary}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  filterContainer: {
    padding: 16,
    paddingTop: 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 