import React, {useState} from 'react';
import {StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert} from 'react-native';
import {Button, TextInput, Card, ActivityIndicator} from 'react-native-paper';
import {ThemedView} from '@/components/ThemedView';
import {ThemedText} from '@/components/ThemedText';
import {useAuth} from '@/contexts/AuthContext';
import apiService from '@/services/api';
import {router} from 'expo-router';
import {useThemeColor} from '@/hooks/useThemeColor';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export default function UseInviteCodeScreen() {
  const {userRole} = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const cardColor = useThemeColor({}, 'background');

  // 检查当前用户是否为普通用户
  React.useEffect(() => {
    if (userRole !== 'normal') {
      Alert.alert('提示', '此功能仅供普通用户使用');
      router.back();
    }
  }, [userRole]);

  // 提交邀请码
  const handleSubmitInviteCode = async () => {
    if (!inviteCode) {
      setError('请输入邀请码');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // 调用使用邀请码的API
      const response = await apiService.useInviteCode(inviteCode);

      // 显示成功消息
      setSuccess(`邀请码使用成功: ${response.message}`);

      // 清空输入框
      setInviteCode('');
    } catch (err: any) {
      console.error('使用邀请码失败:', err);
      setError(err.response?.data?.message || '邀请码使用失败，请检查邀请码是否有效');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* <ThemedText style={styles.header}>使用邀请码</ThemedText> */}

          <Card style={[styles.card, {backgroundColor: cardColor}]}>
            <Card.Content>
              <ThemedText style={styles.description}>
                输入高级用户提供的邀请码以建立用户关联关系。建立关联后，您将能够访问由高级用户授权的传感器数据。
              </ThemedText>

              <TextInput
                label="邀请码"
                value={inviteCode}
                onChangeText={setInviteCode}
                style={styles.input}
                placeholder="请输入邀请码"
                autoCapitalize="none"
                disabled={isLoading}
                error={!!error}
              />

              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

              {success ? <ThemedText style={styles.successText}>{success}</ThemedText> : null}

              <Button
                mode="contained"
                onPress={handleSubmitInviteCode}
                style={styles.button}
                disabled={isLoading || !inviteCode}
                loading={isLoading}
              >
                {isLoading ? '提交中...' : '提交邀请码'}
              </Button>

              <Button mode="outlined" onPress={() => router.back()} style={styles.cancelButton} disabled={isLoading}>
                返回
              </Button>
            </Card.Content>
          </Card>

          <Card style={[styles.card, {backgroundColor: cardColor}]}>
            <Card.Title title="关于邀请码" />
            <Card.Content>
              <ThemedText style={styles.infoText}>• 邀请码由高级用户生成，用于建立用户关联关系</ThemedText>
              <ThemedText style={styles.infoText}>• 每个邀请码只能使用一次</ThemedText>
              <ThemedText style={styles.infoText}>• 邀请码有效期为24小时</ThemedText>
              <ThemedText style={styles.infoText}>• 使用邀请码后，您将被关联到生成邀请码的高级用户</ThemedText>
              <ThemedText style={styles.infoText}>• 高级用户可以授予您对特定传感器的访问权限</ThemedText>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    marginBottom: 20,
    borderRadius: 10,
    elevation: 2,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 8,
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 10,
  },
  successText: {
    color: '#2E7D32',
    marginBottom: 10,
  },
  infoText: {
    marginBottom: 8,
    fontSize: 14,
    opacity: 0.8,
  },
});
