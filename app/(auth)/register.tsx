import { useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, ScrollView, Keyboard, Image, View, TouchableOpacity } from 'react-native';
import { Button, TextInput, Text, HelperText, useTheme, SegmentedButtons, RadioButton } from 'react-native-paper';
import { ThemedView } from '@/components/ThemedView';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import apiService, { decodeJwt, mapUserTypeToRole } from '@/services/api';
import apiAuth from '@/utils/apiAuth';
import { Image as ExpoImage } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';

type UserType = 'senior' | 'normal';

export default function RegisterScreen() {
  const [userType, setUserType] = useState<UserType>('normal');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaImageUri, setCaptchaImageUri] = useState<string | null>(null);
  const theme = useTheme();
  const { login } = useAuth();

  // 组件挂载时获取验证码
  useEffect(() => {
    fetchCaptcha();
  }, []);

  // 获取验证码
  const fetchCaptcha = async () => {
    setLoadingCaptcha(true);
    try {
      const captchaResponse = await apiService.getCaptcha();
      setCaptchaId(captchaResponse.captcha_id);
      setCaptchaImage(captchaResponse.captcha_image);
    } catch (err: any) {
      console.error('获取验证码失败:', err);
    } finally {
      setLoadingCaptcha(false);
    }
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    setError('');

    if (!username || !password || !confirmPassword || !captchaCode) {
      setError('请填写所有必填字段');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    setLoading(true);

    try {
      let response;

      if (userType === 'senior') {
        // 注册高级用户
        response = await apiService.registerSenior(username, password, captchaId, captchaCode);
      } else {
        // 注册普通用户
        response = await apiService.registerNormal(username, password, captchaId, captchaCode);
      }

      // 从JWT令牌中解析用户信息
      const { subject } = decodeJwt(response.token);

      // 根据user_type确定用户角色
      const role = mapUserTypeToRole(subject.user_type);

      // 保存JWT令牌和用户角色 (login方法已经处理了设置API授权令牌)
      await login(response.token, role);

      // 跳转到主页
      router.replace({
        pathname: '/home',
        params: { initial: 'true' }
      });
    } catch (err: any) {
      console.error('Registration failed:', err);
      if (err.response) {
        // 处理来自后端的错误
        setError(err.response.data?.message || '注册失败，请重试');
        // 如果是验证码错误，重新获取验证码
        if (err.response.data?.error === 'captcha_error') {
          fetchCaptcha();
        }
      } else if (err.request) {
        // 请求已发出，但未收到响应
        setError('服务器无响应，请检查网络连接');
      } else {
        // 设置请求时发生的错误
        setError('注册失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require('@/assets/images/react-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text variant="displaySmall" style={[styles.title, {fontFamily: 'Sarasa'}]}>
            智慧农业监测系统
          </Text>

          <Text variant="titleMedium" style={[styles.subtitle, {fontFamily: 'Sarasa'}]}>
            创建新账户
          </Text>

          <View style={styles.radioContainer}>
            <RadioButton.Group
              onValueChange={(value) => setUserType(value as 'normal' | 'senior')}
            value={userType}
            >
              <View style={styles.radioRow}>
                <View style={styles.radioButton}>
                  <RadioButton value="normal" disabled={loading} />
                  <Text style={styles.radioLabel}>普通用户</Text>
                </View>
                <View style={styles.radioButton}>
                  <RadioButton value="senior" disabled={loading} />
                  <Text style={styles.radioLabel}>高级用户</Text>
                </View>
              </View>
            </RadioButton.Group>
          </View>

          <TextInput
            style={styles.input}
            placeholder="用户名"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            disabled={loading}
          />

          <View style={styles.passwordContainer}>
          <TextInput
              style={styles.passwordInput}
              placeholder="密码"
            value={password}
            onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            disabled={loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            disabled={loading}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="确认密码"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              disabled={loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
            >
              <MaterialIcons
                name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

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
              theme={{ fonts: { regular: { fontFamily: 'Sarasa' } } }}
            />

            <View style={styles.captchaImageContainer}>
              {loadingCaptcha ? (
                <View style={styles.captchaImagePlaceholder}>
                  <Text style={{fontFamily: 'Sarasa'}}>加载中...</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={fetchCaptcha}>
                  {captchaImage ? (
                    <ExpoImage
                      source={{ uri: captchaImage }}
                      style={styles.captchaImage}
                      contentFit="contain"
                    />
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
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={[styles.buttonLabel, {fontFamily: 'Sarasa'}]}
            buttonColor={theme.colors.primary}
          >
            {loading ? '注册中...' : '注 册'}
          </Button>

          <Button
            mode="text"
            onPress={() => router.push('/' as any)}
            style={styles.linkButton}
            labelStyle={{fontFamily: 'Sarasa'}}
          >
            已有账号？返回登录
          </Button>
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
  radioContainer: {
    marginBottom: 20,
    width: '100%',
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  radioLabel: {
    marginLeft: 5,
    fontFamily: 'Sarasa',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontFamily: 'Sarasa',
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontFamily: 'Sarasa',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    height: 50,
    justifyContent: 'center',
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
});