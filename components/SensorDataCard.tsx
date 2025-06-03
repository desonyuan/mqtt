import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 传感器数据项属性
export interface SensorDataCardProps {
  temperature: number;
  humidity: number;
  light: number;
  soilMoisture: number;
  co2: number;
  timestamp: number;
}

// 传感器数据卡片组件
const SensorDataCard = ({
  temperature,
  humidity,
  light,
  soilMoisture,
  co2,
  timestamp
}: SensorDataCardProps) => {
  const theme = useTheme();
  
  // 格式化日期时间
  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };
  
  // 处理传感器数据，若值为-999则显示为未知
  const formatSensorValue = (value: number, unit: string) => {
    if (value === -999) {
      return '未知';
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.title}>传感器数据</Text>
          <Text variant="bodySmall">{formatDateTime(timestamp)}</Text>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.dataGrid}>
          {/* 温度 */}
          <View style={styles.dataItem}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="thermometer" 
                size={24} 
                color={theme.colors.primary} 
              />
            </View>
            <View>
              <Text variant="bodyMedium">温度</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                {formatSensorValue(temperature, '°C')}
              </Text>
            </View>
          </View>
          
          {/* 湿度 */}
          <View style={styles.dataItem}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="water-percent" 
                size={24} 
                color={theme.colors.primary} 
              />
            </View>
            <View>
              <Text variant="bodyMedium">湿度</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                {formatSensorValue(humidity, '%')}
              </Text>
            </View>
          </View>
          
          {/* 光照 */}
          <View style={styles.dataItem}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="white-balance-sunny" 
                size={24} 
                color={theme.colors.primary} 
              />
            </View>
            <View>
              <Text variant="bodyMedium">光照</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                {formatSensorValue(light, 'lux')}
              </Text>
            </View>
          </View>
          
          {/* 土壤湿度 */}
          <View style={styles.dataItem}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="water" 
                size={24} 
                color={theme.colors.primary} 
              />
            </View>
            <View>
              <Text variant="bodyMedium">土壤湿度</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                {formatSensorValue(soilMoisture, '%')}
              </Text>
            </View>
          </View>
          
          {/* CO2 */}
          <View style={styles.dataItem}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="molecule-co2" 
                size={24} 
                color={theme.colors.primary} 
              />
            </View>
            <View>
              <Text variant="bodyMedium">CO₂</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                {formatSensorValue(co2, 'ppm')}
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Sarasa',
  },
  divider: {
    marginBottom: 16,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -8,
  },
  dataItem: {
    width: '50%',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
});

export default SensorDataCard; 