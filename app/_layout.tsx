import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {useFonts} from 'expo-font';
import {Slot, Stack} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {StatusBar} from 'expo-status-bar';
import {useEffect} from 'react';
import 'react-native-reanimated';
import {Provider as PaperProvider, MD3LightTheme, MD3DarkTheme, configureFonts, MD3Theme} from 'react-native-paper';

import {useColorScheme} from '@/hooks/useColorScheme';
import {AuthProvider} from '@/contexts/AuthContext';
import apiAuth from '@/utils/apiAuth';
import {SafeAreaProvider, initialWindowMetrics} from 'react-native-safe-area-context';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import Screen from '@/components/screen/Screen';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import AlarmContext, {useAlarm} from '@/contexts/AlarmContext';
// Prevent the splash screen from auto-hiding before asset loading is complete.
// 在资源加载完成之前，防止启动画面自动隐藏。
SplashScreen.preventAutoHideAsync();

// 配置所有文本变体使用Sarasa字体并移除fontWeight
function createThemeFonts(fonts: Record<string, any>) {
  const variants = [
    'displayLarge',
    'displayMedium',
    'displaySmall',
    'headlineLarge',
    'headlineMedium',
    'headlineSmall',
    'titleLarge',
    'titleMedium',
    'titleSmall',
    'bodyLarge',
    'bodyMedium',
    'bodySmall',
    'labelLarge',
    'labelMedium',
    'labelSmall',
  ];

  const result: Record<string, any> = {fontFamily: 'Sarasa'};

  // 为每个变体应用Sarasa字体
  variants.forEach((variant) => {
    if (fonts[variant]) {
      result[variant] = {
        ...fonts[variant],
        fontFamily: 'Sarasa',
        fontWeight: undefined,
      };
    }
  });

  return result;
}

// 创建主题
function createTheme(baseTheme: MD3Theme, primaryColor: string, secondaryColor: string) {
  return {
    ...baseTheme,
    fonts: configureFonts({
      config: createThemeFonts(baseTheme.fonts),
      isV3: true,
    }),
    colors: {
      ...baseTheme.colors,
      primary: primaryColor,
      secondary: secondaryColor,
    },
  };
}

// 创建明暗主题
const lightTheme = createTheme(MD3LightTheme, '#2E7D32', '#4CAF50');
const darkTheme = createTheme(MD3DarkTheme, '#4CAF50', '#81C784');

export default function RootLayout() {
  const colorScheme = useColorScheme();
  //const colorScheme = 'dark'
  const [loaded] = useFonts({
    // 只保留Sarasa字体，移除其他不需要的字体
    Sarasa: require('../assets/fonts/SarasaGothicNerd-Bold.ttf'),
  });
  // 我们不使用defaultProps方式，因为它在TypeScript中有兼容性问题
  // 而是通过theme配置完成全局字体设置

  useEffect(() => {
    if (loaded) {
      // 隐藏启动屏幕
      SplashScreen.hideAsync();

      // 初始化API授权
      apiAuth.initialize().catch((error) => {
        console.error('初始化API授权失败:', error);
      });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <GestureHandlerRootView>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <BottomSheetModalProvider>
              <AuthProvider>
                <AlarmContext>
                  <Stack screenOptions={{headerShown: false, headerTitleAlign: 'left'}}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)/index" />
                    <Stack.Screen name="(auth)/register" />
                    <Stack.Screen
                      name="(stack)/modals/invite-codes"
                      options={{headerShown: true, title: '邀请码管理'}}
                    />
                    <Stack.Screen
                      name="(stack)/modals/use-invite-code"
                      options={{headerShown: true, title: '使用邀请码'}}
                    />
                    {/* <Stack.Screen name="(test)" /> */}
                    <Stack.Screen
                      name="(stack)/device/[id]"
                      options={{title: '设备信息', headerShown: true}}
                    ></Stack.Screen>
                    <Stack.Screen name="+not-found" />
                    <Stack.Screen
                      name="(stack)/article/list"
                      options={{title: '农业文章', headerShown: true}}
                    ></Stack.Screen>
                    <Stack.Screen
                      name="(stack)/article/view/[id]"
                      options={{title: '农业文章', headerShown: true}}
                    ></Stack.Screen>
                    <Stack.Screen
                      name="(stack)/article/crate"
                      options={{title: '发布文章', headerShown: true}}
                    ></Stack.Screen>
                    <Screen />
                  </Stack>
                  {/* <Slot /> */}
                </AlarmContext>
              </AuthProvider>
            </BottomSheetModalProvider>
            <StatusBar style="auto" />
          </ThemeProvider>
        </SafeAreaProvider>
        <Toast />
      </GestureHandlerRootView>
    </PaperProvider>
  );
}
