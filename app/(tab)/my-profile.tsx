import React, {useState, useEffect} from 'react';
import {StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert} from 'react-native';
import {Button, TextInput, Card, Divider, ActivityIndicator, Avatar, List, Portal, Dialog} from 'react-native-paper';
import {ThemedView} from '@/components/ThemedView';
import {ThemedText} from '@/components/ThemedText';
import {useAuth} from '@/contexts/AuthContext';
import apiService, {api, hashPassword} from '@/services/api';
import {useThemeColor} from '@/hooks/useThemeColor';
import {router} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useBoolean, useRequest} from 'ahooks';
import Toast from 'react-native-toast-message';

export default function MyProfileScreen() {
  const {userRole, logout} = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [username, setUsername] = useState('');
  const cardColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();

  // 弹窗状态
  const [dialogVisible, setDialogVisible] = useBoolean();
  // 注销账号用的密码
  const [password, setPassword] = useState('');
  const [checkPassword, setCheckPassword] = useState('');

  // 获取用户角色显示名称
  const getUserRoleName = () => {
    switch (userRole) {
      case 'admin':
        return '管理员';
      case 'senior':
        return '高级用户';
      case 'normal':
        return '普通用户';
      default:
        return '未知';
    }
  };

  // 修改密码处理函数
  const handleChangePassword = async () => {
    try {
      // 表单验证
      if (!currentPassword || !newPassword || !confirmPassword) {
        Alert.alert('错误', '请填写所有密码字段');
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert('错误', '新密码和确认密码不一致');
        return;
      }

      if (newPassword.length < 6) {
        Alert.alert('错误', '新密码长度不能少于6个字符');
        return;
      }

      setIsLoading(true);

      // 调用API更改密码
      await apiService.changePassword(currentPassword, newPassword);

      // 成功后提示并清空输入框
      Alert.alert('成功', '密码已成功更改');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      // 格式化错误信息
      const errorMessage = error.response?.data?.message || error.message || '更改密码时出错';
      Alert.alert('错误', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 跳转到邀请码管理页面（高级用户和管理员）
  const navigateToInviteCodes = () => {
    router.push('/modals/invite-codes');
  };

  // 登出处理函数
  const handleLogout = async () => {
    try {
      await logout();
      apiService.setAuthToken(null); // 清除API服务的token
      router.replace('/(auth)'); // 直接跳转到登录页面
    } catch (error) {
      Alert.alert('错误', '登出时发生错误');
    }
  };
  // 注销账号
  const {run: destroy} = useRequest(
    (password_hash) => {
      return api.delete('/account/delete', {
        data: {password_hash},
      });
    },
    {
      manual: true,
      onError(e: any, params) {
        if (e.status === 401) {
          // Alert.alert('注销失败', '密码不正确');
          Toast.show({
            type: 'error',
            text1: '注销失败',
            text2: '密码不正确',
          });
        }
      },
    }
  );
  //
  const destroyAccount = async () => {
    Alert.alert('严重警告', '注销账号将销毁您的所有账户信息，谨慎操作！！！', [
      {text: '取消'},
      {
        text: '确定注销',
        onPress() {
          setDialogVisible.setTrue();
        },
      },
    ]);
  };
  const startDestroyAccount = () => {
    if (password && password === checkPassword) {
      hashPassword(username, password).then((password_hash) => {
        destroy(password_hash);
      });
    } else {
      Alert.alert('警告', '请输入正确的密码或两次密码不一致');
    }
  };
  // 获取用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await apiService.getHello();
        setUsername(response);
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <ThemedView style={[styles.container, {paddingTop: insets.top}]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Card style={[styles.card, {backgroundColor: cardColor}]}>
            <Card.Content style={styles.profileHeader}>
              <Avatar.Icon size={80} icon="account" style={styles.avatar} />
              <View style={styles.userInfo}>
                <ThemedText style={styles.username}>{username || '用户'}</ThemedText>
                <ThemedText style={styles.role}>{getUserRoleName()}</ThemedText>
              </View>
            </Card.Content>
          </Card>

          {/* 邀请码功能卡片 - 根据用户角色显示不同选项 */}
          <Card style={[styles.card, {backgroundColor: cardColor}]}>
            <Card.Title title="邀请码管理" />
            <Card.Content>
              {userRole === 'admin' || userRole === 'senior' ? (
                <Button mode="contained" onPress={navigateToInviteCodes} style={styles.button} icon="email-plus">
                  {userRole === 'admin' ? '管理所有邀请码' : '管理我的邀请码'}
                </Button>
              ) : userRole === 'normal' ? (
                <List.Item
                  title="使用邀请码"
                  left={(props) => <List.Icon {...props} icon="ticket-confirmation" />}
                  onPress={() => router.push('/modals/use-invite-code')}
                />
              ) : null}

              <ThemedText style={styles.inviteCodeDescription}>
                {userRole === 'admin'
                  ? '您可以查看和管理系统中的所有邀请码。'
                  : userRole === 'senior'
                    ? '您可以生成邀请码邀请普通用户加入系统。'
                    : '使用高级用户提供的邀请码建立用户关联关系。'}
              </ThemedText>
            </Card.Content>
          </Card>

          <Card style={[styles.card, {backgroundColor: cardColor}]}>
            <Card.Title title="修改密码" />
            <Card.Content>
              <TextInput
                label="当前密码"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={secureTextEntry}
                right={
                  <TextInput.Icon
                    icon={secureTextEntry ? 'eye-off' : 'eye'}
                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                  />
                }
                style={styles.input}
              />
              <TextInput
                label="新密码"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={secureTextEntry}
                style={styles.input}
              />
              <TextInput
                label="确认新密码"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={secureTextEntry}
                style={styles.input}
              />
              <Button mode="contained" onPress={handleChangePassword} style={styles.button} disabled={isLoading}>
                {isLoading ? <ActivityIndicator size="small" color="white" /> : '修改密码'}
              </Button>
            </Card.Content>
          </Card>

          <Card style={[styles.card, {backgroundColor: cardColor}]}>
            <Card.Content style={{gap: 15}}>
              <Button
                mode="contained"
                // buttonColor={backgroundColor}
                buttonColor={'#cf7c7c'}
                onPress={destroyAccount}
                // style={styles.logoutButton}
                icon="delete-alert-outline"
              >
                注销账号
              </Button>
              <Button mode="outlined" onPress={handleLogout} icon="logout">
                退出登录
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={setDialogVisible.setFalse}>
          <Dialog.Title>注销账号</Dialog.Title>
          <Dialog.Content style={{gap: 15}}>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              label="请输入密码"
            ></TextInput>
            <TextInput
              value={checkPassword}
              onChangeText={setCheckPassword}
              secureTextEntry
              mode="outlined"
              label="确认密码"
            ></TextInput>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor="rgb(143, 143, 143)" onPress={setDialogVisible.setFalse}>
              取消
            </Button>
            <Button onPress={startDestroyAccount}>注销</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  card: {
    marginBottom: 20,
    borderRadius: 10,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  avatar: {
    marginRight: 20,
    backgroundColor: '#4CAF50',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  role: {
    fontSize: 16,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
  },
  logoutButton: {
    borderColor: '#f44336',
    borderWidth: 1,
  },
  inviteCodeDescription: {
    marginTop: 12,
    opacity: 0.7,
    fontSize: 14,
  },
});
