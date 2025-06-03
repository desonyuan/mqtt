import {Tabs} from 'expo-router';
import React, {useMemo} from 'react';
import {Platform} from 'react-native';

import {HapticTab} from '@/components/HapticTab';
import {IconSymbol} from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import {Colors} from '@/constants/Colors';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useAuth} from '@/contexts/AuthContext';
import {Icon} from 'react-native-paper';
import {BottomTabNavigationOptions} from '@react-navigation/bottom-tabs';

type RouterConfig = {
  name: string;
  options?: BottomTabNavigationOptions & {href?: null | string};
};

const tabBarButton = HapticTab;

const getRoutes = () => {
  const config: RouterConfig[] = [
    {
      name: 'home',
      options: {
        title: '智慧农业监测系统',
        tabBarLabel: '首页',
        headerShown: true,
        tabBarIcon: ({color}) => <Icon size={28} source="home" color={color} />,
        tabBarButton,
      },
    },
    {
      name: 'user-admin',
      options: {
        title: '用户管理',
        tabBarLabel: '用户',
        headerShown: true,
        tabBarIcon: ({color}) => <Icon size={28} source="account-group" color={color} />,
        tabBarButton,
      },
    },
    {
      name: 'sensors',
      options: {
        title: '传感器',
        headerShown: true,
        tabBarIcon: ({color}) => <Icon size={28} source="chip" color={color} />,
        tabBarButton,
      },
    },
    {
      name: 'sensor-config',
      options: {
        title: '嵌入式设备列表',
        tabBarLabel: '配置',
        headerShown: true,
        tabBarIcon: ({color}) => <Icon size={28} source="cog-outline" color={color} />,
        tabBarButton,
      },
    },
    {
      name: 'sensor-permissions',
      options: {
        headerShown: true,
        title: '嵌入式设备权限管理',
        tabBarLabel: '权限',
        tabBarIcon: ({color}) => <Icon size={28} source="account-lock" color={color} />,
        tabBarButton,
      },
    },
    {
      name: 'my-profile',
      options: {
        title: '我的',
        tabBarIcon: ({color}) => <Icon size={28} source="account" color={color} />,
        tabBarButton,
      },
    },
  ];
  return config;
};

// 根据用户角色确定哪些屏幕可见
const getTabScreenVisibility = (role: string) => {
  // 所有用户都可以访问的屏幕
  const commonScreens = ['home', 'sensors', 'my-profile'];

  // 高级用户和管理员可以访问的屏幕
  const seniorScreens = [...commonScreens, 'sensor-config'];

  // 管理员可以访问的屏幕
  const adminScreens = [...seniorScreens, 'user-admin', 'sensor-permissions'];

  if (role === 'admin') {
    return adminScreens;
  } else if (role === 'senior') {
    return seniorScreens;
  } else {
    return commonScreens;
  }
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const {userRole} = useAuth();

  const screens = useMemo(() => {
    if (userRole) {
      const userRoters = getTabScreenVisibility(userRole);
      return getRoutes().map((c) => {
        const op = c.options;
        if (!userRoters.includes(c.name)) {
          if (op) {
            delete op.tabBarButton;
            op.href = null;
            c.options = op;
          } else {
            c.options = {href: null};
          }
        }
        return {
          ...c,
        };
      });
    }
    return [];
  }, [userRole]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false, // 隐藏所有顶部标题栏
        tabBarBackground: TabBarBackground,
        tabBarLabelStyle: {
          fontFamily: 'Sarasa',
        },
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {
            elevation: 5, // 为安卓添加阴影
            height: 60, // 固定高度
          },
        }),
      }}
    >
      {screens.map((screen) => {
        return <Tabs.Screen key={screen.name} name={screen?.name} options={screen?.options as any} />;
      })}

      {/* 探索标签 */}
      {/* <Tabs.Screen
        name="explore"
        options={{
          title: '探索',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          tabBarButton: getTabScreenVisibility('explore') ? HapticTab : () => null,
        }}
      /> */}

      {/* 模态窗口以标签页形式添加，但在UI中不会显示 */}
      {/* <Tabs.Screen
        name="modals/invite-codes"
        options={{
          href: null, // 禁止通过标签直接访问
          headerShown: true,
          headerTitle: '邀请码管理',
        }}
      />

      <Tabs.Screen
        name="modals/use-invite-code"
        options={{
          href: null, // 禁止通过标签直接访问
          headerShown: true,
          headerTitle: '使用邀请码',
        }}
      /> */}
    </Tabs>
  );
}
