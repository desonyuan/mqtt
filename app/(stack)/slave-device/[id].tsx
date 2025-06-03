import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, AppState, AppStateStatus } from 'react-native';
import { Text, ActivityIndicator, Card, useTheme, IconButton, Button, Dialog, Portal } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/ThemedView';
import SensorDataCard from '@/components/SensorDataCard';
import mqttService from '@/services/mqtt';
import { useAuth } from '@/contexts/AuthContext';
import { type Data, type DataPayload } from '@/proto/data_payload_pb';

enum UserRole {
  ADMIN = 'admin',
  SENIOR = 'senior',
  NORMAL = 'normal',
}

export default function SlaveDeviceScreen() {
  const { id } = useLocalSearchParams();
  const deviceId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const theme = useTheme();
  const { userRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sensorData, setSensorData] = useState<Data | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);

  // 处理MQTT传感器数据
  const handleSensorData = (payload: DataPayload) => {
    if (!payload.datasets || payload.datasets.length === 0) {
      return;
    }
    
    // 查找当前设备的数据
    const deviceData = payload.datasets.find(data => data.deviceUuid === deviceId);
    if (deviceData) {
      setSensorData(deviceData);
    }
  };

  // 订阅MQTT主题
  const subscribeMqtt = () => {
    if (deviceId) {
      // 订阅设备数据主题
      mqttService.subscribeDeviceData(deviceId, handleSensorData);
    }
  };

  // 刷新设备数据
  const handleRefresh = async () => {
    setRefreshing(true);
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

  // 处理AppState变化
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // 当应用从后台回到前台时重新初始化MQTT连接
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App has come to the foreground!');
      initializeData();
    } else if (nextAppState.match(/inactive|background/) && appState === 'active') {
      // 当应用进入后台时，考虑断开MQTT连接以节省资源
      console.log('App has gone to the background!');
    }
    
    setAppState(nextAppState);
  };

  // 初始化数据
  const initializeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!deviceId) {
        throw new Error('设备ID不能为空');
      }
      
      // 确保MQTT连接已经初始化
      await mqttService.connect();
      
      // 订阅MQTT主题
      subscribeMqtt();
    } catch (error) {
      console.error('初始化失败:', error);
      setError('加载数据失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    if (deviceId) {
      initializeData();
      
      // 添加AppState变化监听
      const subscription = AppState.addEventListener('change', handleAppStateChange);
      
      // 组件卸载时清理
      return () => {
        if (deviceId) {
          mqttService.unsubscribe(mqttService.getDataTopic(deviceId));
        }
        subscription.remove();
      };
    }
  }, [deviceId]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 20 }}>加载设备数据...</Text>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Text>{error}</Text>
        <Button mode="contained" onPress={handleRefresh} style={{ marginTop: 16 }}>
          重试
        </Button>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
          />
          <Text variant="titleLarge" style={styles.headerTitle} numberOfLines={1} ellipsizeMode="middle">
            从设备: {deviceId}
          </Text>
          {(userRole === UserRole.SENIOR || userRole === UserRole.ADMIN) && (
            <IconButton
              icon="cog"
              size={24}
              onPress={handleOpenConfig}
            />
          )}
        </View>

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* 传感器数据卡片 */}
          {sensorData ? (
            <SensorDataCard
              temperature={sensorData.temperature}
              humidity={sensorData.humidity}
              light={sensorData.light}
              soilMoisture={sensorData.soilMoisture}
              co2={sensorData.co2}
              timestamp={sensorData.timestamp}
            />
          ) : (
            <Card style={styles.noDataCard}>
              <Card.Content style={styles.noDataContent}>
                <Text>无传感器数据</Text>
                <Text variant="bodySmall">请确保设备已连接且正常工作</Text>
              </Card.Content>
            </Card>
          )}
        </ScrollView>

        {/* 配置对话框 */}
        <Portal>
          <Dialog visible={showConfigDialog} onDismiss={() => setShowConfigDialog(false)}>
            <Dialog.Title>设备配置</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">
                您想要配置此设备的哪些参数？
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowConfigDialog(false)}>取消</Button>
              <Button onPress={handleGoToConfig}>传感器配置</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
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
}); 