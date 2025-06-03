import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput, Button, useTheme, IconButton, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import deviceApi from '@/services/deviceApi';

enum UserRole {
  ADMIN = 'admin',
  SENIOR = 'senior',
  NORMAL = 'normal',
}

export default function RegisterDeviceScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { userRole } = useAuth();

  const [deviceUuid, setDeviceUuid] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 注册设备
  const handleRegisterDevice = async () => {
    // 验证设备UUID
    if (!deviceUuid.trim()) {
      setError('设备UUID不能为空');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await deviceApi.registerDevice(deviceUuid.trim());
      
      // 显示成功消息
      setSnackbarMessage('设备注册成功');
      setSnackbarVisible(true);
      
      // 清空表单
      setDeviceUuid('');
      
      // 3秒后返回设备列表
      setTimeout(() => {
        router.replace('/devices');
      }, 3000);
    } catch (error: any) {
      console.error('注册设备失败:', error);
      
      // 显示错误消息
      if (error.response && error.response.data && error.response.data.error) {
        if (error.response.data.error === 'forbidden') {
          setError('没有权限注册设备');
        } else if (error.response.data.error === 'unique_violation') {
          setError('设备已被注册');
        } else {
          setError(`注册失败: ${error.response.data.error}`);
        }
      } else {
        setError('注册设备失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

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
              注册设备
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
            注册设备
          </Text>
        </View>

        <View style={styles.content}>
          <Text variant="bodyLarge" style={styles.description}>
            请输入要注册的设备UUID，注册后设备将与您的账号关联。
          </Text>
          
          <TextInput
            label="设备UUID"
            value={deviceUuid}
            onChangeText={setDeviceUuid}
            mode="outlined"
            style={styles.input}
            error={!!error}
          />
          
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          
          <Button
            mode="contained"
            onPress={handleRegisterDevice}
            loading={loading}
            disabled={loading || !deviceUuid.trim()}
            style={styles.button}
          >
            注册设备
          </Button>
        </View>

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
  content: {
    padding: 16,
  },
  description: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
}); 