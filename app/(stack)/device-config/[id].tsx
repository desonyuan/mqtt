import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, ActivityIndicator, useTheme, IconButton, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/ThemedView';
import SensorConfigForm from '@/components/SensorConfigForm';
import mqttService from '@/services/mqtt';
import { useAuth } from '@/contexts/AuthContext';
import { type ConfigPayload } from '@/proto/config_payload_pb';

enum UserRole {
  ADMIN = 'admin',
  SENIOR = 'senior',
  NORMAL = 'normal',
}

export default function DeviceConfigScreen() {
  const { id } = useLocalSearchParams();
  const deviceId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const theme = useTheme();
  const { userRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [currentConfig, setCurrentConfig] = useState<ConfigPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 处理设备配置响应
  const handleDeviceConfig = (config: ConfigPayload) => {
    if (config.deviceUuid === deviceId) {
      setCurrentConfig(config);
      setLoading(false);
    }
  };

  // 提交设备配置
  const handleSubmitConfig = (config: ConfigPayload) => {
    setConfigLoading(true);
    
    try {
      // 确保设置设备UUID
      const configToSend = {
        ...config,
        deviceUuid: deviceId,
      };
      
      // 发送配置到MQTT主题
      mqttService.sendDeviceConfig(deviceId, configToSend);
      
      // 显示成功消息
      setSnackbarMessage('配置已发送到设备');
      setSnackbarVisible(true);
    } catch (error) {
      console.error('发送配置失败:', error);
      setSnackbarMessage('配置发送失败');
      setSnackbarVisible(true);
    } finally {
      setConfigLoading(false);
    }
  };

  // 请求当前设备配置
  const fetchDeviceConfig = () => {
    // 订阅设备配置主题
    mqttService.subscribeDeviceConfig(deviceId, handleDeviceConfig);
    
    // 请求设备当前配置
    mqttService.requestDeviceConfig(deviceId);
  };

  // 初始化加载
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 确保MQTT连接已经初始化
        await mqttService.connect();
        
        // 请求设备配置
        fetchDeviceConfig();
        
        // 设置获取配置超时
        const timeoutId = setTimeout(() => {
          if (loading) {
            setLoading(false);
            setCurrentConfig(null);
          }
        }, 5000);
        
        return () => clearTimeout(timeoutId);
      } catch (error) {
        console.error('初始化失败:', error);
        setError('加载数据失败，请检查网络连接');
        setLoading(false);
      }
    };
    
    initializeData();
    
    // 组件卸载时取消MQTT订阅
    return () => {
      mqttService.unsubscribe(mqttService.getConfigUpTopic(deviceId));
    };
  }, [deviceId]);

  // 非高级用户和管理员不能访问此页面
  if (userRole !== UserRole.SENIOR && userRole !== UserRole.ADMIN) {
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
            <Text variant="titleLarge" style={styles.headerTitle}>
              设备配置
            </Text>
          </View>
          
          <View style={styles.errorContainer}>
            <Text>您没有权限访问此页面</Text>
          </View>
        </SafeAreaView>
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
          <Text variant="titleLarge" style={styles.headerTitle}>
            设备配置
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 20 }}>获取设备配置中...</Text>
          </View>
        ) : (
          <SensorConfigForm
            initialConfig={currentConfig || { 
              deviceUuid: deviceId,
              slaveUuids: [],
              thresholds: {}
            }}
            onSubmit={handleSubmitConfig}
            loading={configLoading}
          />
        )}

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          action={{
            label: '确定',
            onPress: () => setSnackbarVisible(false),
          }}
        >
          {snackbarMessage}
        </Snackbar>
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
}); 