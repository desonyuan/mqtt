import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Badge, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DeviceOnlineStatus } from '@/services/deviceApi';

// 格式化时间工具函数
const formatDateTime = (dateTimeStr: string) => {
  const date = new Date(dateTimeStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (diffDays === 1) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
};

// 设备项组件属性
interface DeviceItemProps {
  deviceUuid: string;
  isOnline: boolean;
  lastSeen: string;
  onPress: (deviceUuid: string) => void;
}

// 设备项组件
const DeviceItem = ({ deviceUuid, isOnline, lastSeen, onPress }: DeviceItemProps) => {
  const theme = useTheme();
  
  return (
    <TouchableOpacity onPress={() => onPress(deviceUuid)}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.deviceHeader}>
            <MaterialCommunityIcons 
              name="cube-outline" 
              size={24} 
              color={theme.colors.primary} 
            />
            <Text 
              variant="titleMedium" 
              style={[styles.deviceTitle, { color: theme.colors.primary }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {deviceUuid}
            </Text>
          </View>
          
          <View style={styles.deviceInfo}>
            <Badge 
              style={[
                styles.statusBadge, 
                { backgroundColor: isOnline ? theme.colors.primary : theme.colors.error }
              ]}
            >
              {isOnline ? '在线' : '离线'}
            </Badge>
            <Text variant="bodySmall" style={styles.timeText}>
              {isOnline ? '当前在线' : `最后活动: ${formatDateTime(lastSeen)}`}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

// 设备列表组件属性
interface DeviceListProps {
  devices: DeviceOnlineStatus[];
  onDevicePress: (deviceUuid: string) => void;
  emptyMessage?: string;
  loading?: boolean;
}

// 设备列表组件
const DeviceList = ({ 
  devices, 
  onDevicePress, 
  emptyMessage = "没有设备",
  loading = false
}: DeviceListProps) => {
  const theme = useTheme();

  const renderItem = ({ item }: { item: DeviceOnlineStatus }) => (
    <DeviceItem
      deviceUuid={item.device_uuid}
      isOnline={item.is_online}
      lastSeen={item.time}
      onPress={onDevicePress}
    />
  );

  if (devices.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons 
          name="devices" 
          size={64} 
          color={theme.colors.outline} 
        />
        <Text variant="bodyLarge" style={{ color: theme.colors.outline, marginTop: 16 }}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={devices}
      renderItem={renderItem}
      keyExtractor={(item) => item.device_uuid}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceTitle: {
    marginLeft: 8,
    flex: 1,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    marginRight: 8,
  },
  timeText: {
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});

export default DeviceList; 