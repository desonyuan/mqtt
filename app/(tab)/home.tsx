// import { Redirect } from 'expo-router';

// export default function AppIndex() {
//   // 重定向到tabs首页
//   return <Redirect href="/(app)/(tabs)" />;
// }
import {useState, useEffect, useLayoutEffect} from 'react';
import {StyleSheet, View, ScrollView, Image, RefreshControl} from 'react-native';
import {Text, Button, Card, ActivityIndicator, Appbar, useTheme} from 'react-native-paper';
import {ThemedView} from '@/components/ThemedView';
import {useAuth} from '@/contexts/AuthContext';
import apiService from '@/services/api';
import {router, useNavigation} from 'expo-router';
import PostBlock from '@/components/screen/home/PostBlock';

export default function HomeScreen() {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const {logout, userRole} = useAuth();
  const navigation = useNavigation();

  const fetchHelloMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getHello();
      setUsername(response);
      setGreeting(`欢迎您，${response}！`);
    } catch (err: any) {
      console.error('Failed to fetch hello message:', err);
      if (err.response?.status === 401) {
        setError('未授权，请重新登录');
      } else {
        setError('获取信息失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHelloMessage();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHelloMessage();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      apiService.setAuthToken(null);
      router.replace('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight() {
        return <Appbar.Action icon="logout" onPress={handleLogout} />;
      },
    });
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Card style={styles.card}>
        <Card.Cover source={require('@/assets/images/react-logo.png')} />
        <Card.Title
          title={`欢迎使用智慧农业监测系统${username ? '，' + username : ''}`}
          subtitle={`当前用户类型: ${
            userRole === 'admin' ? '管理员' : userRole === 'senior' ? '高级用户' : '普通用户'
          }`}
        />
        <Card.Content>
          <View style={styles.greetingContainer}>
            {loading ? (
              <ActivityIndicator animating={true} size="large" />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text variant="headlineSmall" style={styles.greeting}>
                {greeting || '欢迎您！'}
              </Text>
            )}
          </View>
        </Card.Content>
        <Card.Actions>
          <Button onPress={fetchHelloMessage} disabled={loading}>
            刷新
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="系统功能" />
        <Card.Content>
          <Text variant="bodyMedium">
            • 实时监测农田环境数据{'\n'}• 智能灌溉控制系统{'\n'}
            {/* • 作物生长状况跟踪{'\n'}
          • 天气预报及预警信息{'\n'}
          • 农业专家在线咨询 */}
          </Text>
        </Card.Content>
      </Card>
      <PostBlock />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 10,
    // paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
  },
  greetingContainer: {
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  greeting: {
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});
