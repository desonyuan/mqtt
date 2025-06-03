import {useState, useEffect} from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Keyboard,
  Image,
  Alert,
  View,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {Button, TextInput, Text, HelperText, useTheme} from 'react-native-paper';
import {ThemedView} from '@/components/ThemedView';
import {router} from 'expo-router';
import {useAuth} from '@/contexts/AuthContext';
import apiService, {decodeJwt, mapUserTypeToRole, CaptchaResponse} from '@/services/api';
import apiAuth from '@/utils/apiAuth';
import {Image as ExpoImage} from 'expo-image';
import * as Clipboard from 'expo-clipboard';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const {login, isLoggedIn, resetFirstTimeUser} = useAuth();

  // 如果已登录，跳转到应用主页
  useEffect(() => {
    if (isLoggedIn) {
      router.replace({
        pathname: '/home',
        params: {initial: 'true'},
      });
    } else {
      // 加载验证码
      fetchCaptcha();
    }
  }, [isLoggedIn]);

  // 获取验证码
  const fetchCaptcha = async () => {
    setLoadingCaptcha(true);
    try {
      const captchaResponse = await apiService.getCaptcha();
      setCaptchaId(captchaResponse.captcha_id);
      setCaptchaImage(captchaResponse.captcha_image);
    } catch (err: any) {
      console.error('获取验证码失败:', err);
      Alert.alert('错误', '获取验证码失败，请重试');
    } finally {
      setLoadingCaptcha(false);
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    setError('');

    if (!username || !password || !captchaCode) {
      setError('请填写所有字段');
      return;
    }

    setLoading(true);

    try {
      // 调用登录API
      const response = await apiService.login(username, password, captchaId, captchaCode);

      // 从JWT令牌中解析用户信息
      const {subject, payload} = decodeJwt(response.token);
      // 根据user_type确定用户角色
      const role = mapUserTypeToRole(subject.user_type);

      // 保存JWT令牌和角色 (login方法已经处理了设置API授权令牌)
      await login(response.token, role);
      console.log(subject, payload);

      // 跳转到主页
      router.replace({
        pathname: '/home',
        params: {initial: 'true'},
      });
    } catch (err: any) {
      if (err.response) {
        // 处理来自后端的错误
        setError(err.response.data?.message || '登录失败，请检查用户名、密码或验证码');
        // 如果是验证码错误，重新获取验证码
        if (err.response.data?.error === 'captcha_error') {
          fetchCaptcha();
        }
      } else if (err.request) {
        // 请求已发出，但未收到响应
        setError('服务器无响应，请检查网络连接');
      } else {
        // 设置请求时发生的错误
        setError('登录失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 重置首次用户状态，并重新加载应用
  const handleResetFirstTimeUser = async () => {
    try {
      await resetFirstTimeUser();
      Alert.alert('重置成功', '已将您的状态重置为首次用户状态，点击确定后将重新加载应用', [
        {
          text: '确定',
          onPress: () => {
            if (Platform.OS === 'web') {
              window.location.href = '/';
            } else {
              Alert.alert('请重启应用', '请完全关闭应用后重新打开，以确保更改生效', [
                {
                  text: '知道了',
                  onPress: () => {
                    router.replace('/(auth)');
                  },
                },
              ]);
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert('错误', '重置首次用户状态失败');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Image source={require('@/assets/images/react-logo.png')} style={styles.logo} resizeMode="contain" />

          <Text variant="displaySmall" style={[styles.title, {fontFamily: 'Sarasa'}]}>
            智慧农业监测系统
          </Text>

          <Text variant="titleMedium" style={[styles.subtitle, {fontFamily: 'Sarasa'}]}>
            欢迎回来，请登录
          </Text>

          <TextInput
            mode="outlined"
            label="用户名"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
            autoCapitalize="none"
            disabled={loading}
            placeholder="请输入用户名"
            theme={{fonts: {regular: {fontFamily: 'Sarasa'}}}}
          />

          <TextInput
            mode="outlined"
            label="密码"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
            disabled={loading}
            placeholder="请输入密码"
            theme={{fonts: {regular: {fontFamily: 'Sarasa'}}}}
          />

          <View style={styles.captchaContainer}>
            <TextInput
              mode="outlined"
              label="验证码"
              value={captchaCode}
              onChangeText={setCaptchaCode}
              style={styles.captchaInput}
              left={<TextInput.Icon icon="shield-account" />}
              disabled={loading}
              placeholder="请输入验证码"
              theme={{fonts: {regular: {fontFamily: 'Sarasa'}}}}
            />

            <View style={styles.captchaImageContainer}>
              {loadingCaptcha ? (
                <View style={styles.captchaImagePlaceholder}>
                  <Text style={{fontFamily: 'Sarasa'}}>加载中...</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={fetchCaptcha}>
                  {captchaImage ? (
                    <ExpoImage source={{uri: captchaImage}} style={styles.captchaImage} contentFit="contain" />
                  ) : (
                    <View style={styles.captchaImagePlaceholder}>
                      <Text style={{fontFamily: 'Sarasa'}}>点击获取验证码</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {error ? (
            <HelperText type="error" visible={!!error} style={{fontFamily: 'Sarasa'}}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={[styles.buttonLabel, {fontFamily: 'Sarasa'}]}
            buttonColor={theme.colors.primary}
          >
            {loading ? '登录中...' : '登 录'}
          </Button>

          <Button
            mode="text"
            onPress={() => router.push('/(auth)/register')}
            style={styles.linkButton}
            labelStyle={{fontFamily: 'Sarasa'}}
          >
            没有账号？立即注册
          </Button>
          {/* 测试按钮 - 仅用于开发 */}
          <View style={styles.devTools}>
            <Button
              mode="outlined"
              onPress={handleResetFirstTimeUser}
              style={styles.devButton}
              icon="refresh"
              labelStyle={{fontFamily: 'Sarasa'}}
            >
              重置为首次用户（返回欢迎页）
            </Button>

            <Button
              mode="outlined"
              onPress={() => router.push('/(test)/encrypt')}
              style={styles.devButton}
              icon="lock"
              labelStyle={{fontFamily: 'Sarasa'}}
            >
              密码加密工具
            </Button>
          </View>
        </ScrollView>
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
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Sarasa',
  },
  subtitle: {
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.7,
    fontFamily: 'Sarasa',
  },
  input: {
    width: '100%',
    marginBottom: 16,
  },
  captchaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  captchaInput: {
    flex: 1,
    marginRight: 15,
  },
  captchaImageContainer: {
    width: 170,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captchaImage: {
    width: 170,
    height: 90,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  captchaImagePlaceholder: {
    width: 170,
    height: 90,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    marginTop: 10,
    padding: 6,
  },
  buttonLabel: {
    fontSize: 16,
    fontFamily: 'Sarasa',
  },
  linkButton: {
    marginTop: 16,
  },
  fontSarasa: {
    fontFamily: 'Sarasa',
  },
  devTools: {
    marginTop: 40,
    padding: 10,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  devButton: {
    marginVertical: 5,
  },
});
