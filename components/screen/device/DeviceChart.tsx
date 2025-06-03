import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {LineChart} from 'react-native-gifted-charts';

import {ThemedText} from '@/components/ThemedText';
import {useThemeColor} from '@/hooks/useThemeColor';
import {type DataPayload} from '@/proto/data_payload_pb';
import mqttService from '@/services/mqtt';
import {Chip} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const MAX_DATA_POINTS = 20; // 显示最近20个数据点
const {width} = Dimensions.get('window');

interface SensorData {
  temperature: number;
  humidity: number;
  light: number;
  soil_moisture: number;
  co2: number;
  device_uuid: string;
  timestamp: number;
}

interface DeviceChartProps {
  deviceId: string;
  time: number;
}

export default function DeviceChart({deviceId, time}: DeviceChartProps) {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [dataStatus, setDataStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [loading, setLoading] = useState(true);
  const [selectedChartIndex, setSelectedChartIndex] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // 获取主题色
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const chartColor = useThemeColor({}, 'tint');
  const chartBgColor = useThemeColor({light: 'rgba(240, 240, 240, 0.8)', dark: 'rgba(30, 30, 30, 0.8)'}, 'background');

  // 定义各个传感器的颜色和单位
  const sensorConfig = [
    {name: '温度', unit: '°C', color: '#FF5252', accessor: (d: SensorData) => d.temperature, icon: '🌡️'},
    {name: '湿度', unit: '%', color: '#2196F3', accessor: (d: SensorData) => d.humidity, icon: '💧'},
    {name: '光照', unit: 'lux', color: '#FFC107', accessor: (d: SensorData) => d.light, icon: '☀️'},
    {name: '土壤湿度', unit: '%', color: '#4CAF50', accessor: (d: SensorData) => d.soil_moisture, icon: '🌱'},
    {name: ' CO2', unit: 'ppm', color: '#FF9800', accessor: (d: SensorData) => d.co2, icon: '☁️'},
  ];

  // 处理MQTT传感器数据
  const handleSensorData = (payload: DataPayload) => {
    console.log(payload, 'MQTT payload received');

    if (!payload.datasets || payload.datasets.length === 0) {
      return;
    }

    // 查找当前设备的数据
    const deviceData = payload.datasets.find((data) => data.deviceUuid === deviceId);
    if (deviceData) {
      // 将设备数据转换为SensorData对象
      const newData: SensorData = {
        temperature: deviceData.temperature,
        humidity: deviceData.humidity,
        light: deviceData.light,
        soil_moisture: deviceData.soilMoisture,
        co2: deviceData.co2,
        device_uuid: deviceData.deviceUuid,
        timestamp: deviceData.timestamp + time,
      };

      // 更新传感器数据数组，保留最近的数据
      setSensorData((prevData) => {
        const updatedData = [...prevData, newData];
        return updatedData.slice(-MAX_DATA_POINTS); // 只保留最近的MAX_DATA_POINTS个数据点
      });

      setLoading(false);
      setDataStatus('connected');
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    if (deviceId) {
      mqttService.subscribeDeviceData(deviceId, handleSensorData);
      return () => {
        console.log('组件卸载，取消MQTT订阅');
        mqttService.unsubscribe(mqttService.getDataTopic(deviceId));
      };
    }
  }, [deviceId]);

  // 获取状态的显示样式
  const getStatusColor = (status: 'connected' | 'disconnected'): string => {
    switch (status) {
      case 'connected':
        return '#4CAF50'; // 绿色
      case 'disconnected':
        return '#9E9E9E'; // 灰色
      default:
        return '#9E9E9E';
    }
  };

  // 获取状态的显示文本
  const getStatusText = (status: 'connected' | 'disconnected'): string => {
    switch (status) {
      case 'connected':
        return '已连接';
      case 'disconnected':
        return '未连接';
      default:
        return '未知状态';
    }
  };

  // 渲染图表
  const renderChart = (sensorIndex: number) => {
    const sensor = sensorConfig[sensorIndex];
    const values = sensorData.map(sensor.accessor);

    // 确保数据有效
    if (!values || values.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <ThemedText style={[styles.noDataText, {fontFamily: 'Sarasa'}]}>暂无数据</ThemedText>
        </View>
      );
    }

    // 取最新的20个数据点
    const displayData = values.slice(-MAX_DATA_POINTS);

    // 计算适当的数值范围
    const max = Math.max(...displayData);
    const min = Math.min(...displayData);
    // 确保有足够范围来显示波动
    const range = max - min > 0 ? max - min : 10;
    // 添加一些上下空间以确保线不会太靠近边缘
    const yMax = max + range * 0.2;
    const yMin = Math.max(0, min - range * 0.2); // 确保最小值不小于0

    // 为图表准备数据，重要：使用简单格式避免复杂处理
    const chartData = displayData.map((value) => ({
      value: value || 0,
    }));

    return (
      <View style={[styles.chartContainer, {backgroundColor: chartBgColor}]}>
        <View style={styles.chartHeaderContainer}>
          <ThemedText style={[styles.chartTitle, {fontFamily: 'Sarasa'}]}>
            {sensor.icon} {sensor.name}
          </ThemedText>
          <ThemedText style={[styles.chartValue, {fontFamily: 'Sarasa'}]}>
            {values[values.length - 1]?.toFixed(1) || '-'} {sensor.unit}
          </ThemedText>
        </View>

        <View style={styles.chartWrapper}>
          <LineChart
            areaChart
            data={chartData}
            rotateLabel
            width={width - 130}
            height={200}
            hideDataPoints
            spacing={14}
            color={sensor.color}
            thickness={2.5}
            startFillColor={sensor.color}
            endFillColor="transparent"
            startOpacity={0.2}
            endOpacity={0.01}
            initialSpacing={0}
            endSpacing={10}
            maxValue={yMax}
            noOfSections={5}
            yAxisLabelSuffix={sensor.unit}
            yAxisTextStyle={{color: textColor, fontSize: 12, fontFamily: 'Sarasa'}}
            yAxisLabelWidth={40}
            rulesType="solid"
            rulesColor="rgba(200,200,200,0.2)"
            xAxisColor="rgba(200,200,200,0.4)"
            yAxisColor="rgba(200,200,200,0.4)"
            pointerConfig={{
              pointerStripHeight: 160,
              pointerStripColor: sensor.color,
              pointerStripWidth: 2,
              pointerColor: sensor.color,
              radius: 6,
              pointerLabelWidth: 100,
              pointerLabelHeight: 70,
              autoAdjustPointerLabelPosition: true,
              stripOverPointer: true,
              pointerLabelComponent: (items: any) => {
                const item = items[0];
                return (
                  <View style={[styles.tooltipContainer, {backgroundColor: sensor.color}]}>
                    <ThemedText style={[styles.tooltipTitle, {fontFamily: 'Sarasa'}]}>{sensor.name}</ThemedText>
                    <ThemedText style={[styles.tooltipValue, {fontFamily: 'Sarasa'}]}>
                      {item?.value?.toFixed(1)} {sensor.unit}
                    </ThemedText>
                  </View>
                );
              },
            }}
          />
        </View>

        <View style={styles.chartFooter}>
          <ThemedText style={[styles.chartFooterText, {fontFamily: 'Sarasa'}]}>
            实时数据 • {displayData.length} 个数据点
          </ThemedText>
          <ThemedText style={[styles.chartFooterText, {fontFamily: 'Sarasa'}]}>设备ID: {deviceId || 'N/A'}</ThemedText>
        </View>
      </View>
    );
  };

  if (loading && sensorData.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor}]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={chartColor} />
          <ThemedText style={[styles.loadingText, {fontFamily: 'Sarasa'}]}>等待传感器数据...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, {backgroundColor, paddingTop: insets.top}]}>
      <View style={styles.headerContainer}>
        <ThemedText style={[styles.header, {fontFamily: 'Sarasa'}]}>传感器数据</ThemedText>
        <Chip
          mode="outlined"
          style={{backgroundColor: getStatusColor(dataStatus), opacity: 0.8}}
          textStyle={{fontFamily: 'Sarasa', color: '#fff'}}
        >
          {getStatusText(dataStatus)}
        </Chip>
      </View>

      <View style={styles.tabContainer}>
        {sensorConfig.map((sensor, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.navButton,
              selectedChartIndex === index && styles.navButtonActive,
              {backgroundColor: selectedChartIndex === index ? sensor.color : 'rgba(128, 128, 128, 0.2)'},
            ]}
            onPress={() => setSelectedChartIndex(index)}
          >
            <ThemedText
              style={[
                styles.navButtonText,
                {color: selectedChartIndex === index ? '#FFF' : textColor, fontFamily: 'Sarasa'},
              ]}
            >
              {sensor.icon}
            </ThemedText>
            <ThemedText
              style={[
                styles.navButtonText,
                {color: selectedChartIndex === index ? '#FFF' : textColor, fontFamily: 'Sarasa'},
              ]}
            >
              {sensor.name}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {renderChart(selectedChartIndex)}

      <View style={styles.statsContainer}>
        <ThemedText style={[styles.statsHeader, {fontFamily: 'Sarasa'}]}>数据统计</ThemedText>
        {sensorData.length > 0 && (
          <View style={styles.statsGrid}>
            {sensorConfig.map((sensor, index) => {
              const values = sensorData.map(sensor.accessor).filter((v) => v !== undefined && v !== null);
              const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
              const max = Math.max(...values);
              const min = Math.min(...values);

              return (
                <View key={index} style={styles.statItem}>
                  <View style={[styles.statHeader, {backgroundColor: sensor.color}]}>
                    <ThemedText style={[styles.statTitle, {fontFamily: 'Sarasa'}]}>
                      {sensor.icon} {sensor.name}
                    </ThemedText>
                  </View>
                  <View style={styles.statContent}>
                    <View style={styles.statRow}>
                      <ThemedText style={[styles.statLabel, {fontFamily: 'Sarasa'}]}>当前值:</ThemedText>
                      <ThemedText style={[styles.statValue, {fontFamily: 'Sarasa'}]}>
                        {values[values.length - 1]?.toFixed(1) || '-'} {sensor.unit}
                      </ThemedText>
                    </View>
                    <View style={styles.statRow}>
                      <ThemedText style={[styles.statLabel, {fontFamily: 'Sarasa'}]}>平均值:</ThemedText>
                      <ThemedText style={[styles.statValue, {fontFamily: 'Sarasa'}]}>
                        {avg.toFixed(1)} {sensor.unit}
                      </ThemedText>
                    </View>
                    <View style={styles.statRow}>
                      <ThemedText style={[styles.statLabel, {fontFamily: 'Sarasa'}]}>最大值:</ThemedText>
                      <ThemedText style={[styles.statValue, {fontFamily: 'Sarasa'}]}>
                        {max.toFixed(1)} {sensor.unit}
                      </ThemedText>
                    </View>
                    <View style={styles.statRow}>
                      <ThemedText style={[styles.statLabel, {fontFamily: 'Sarasa'}]}>最小值:</ThemedText>
                      <ThemedText style={[styles.statValue, {fontFamily: 'Sarasa'}]}>
                        {min.toFixed(1)} {sensor.unit}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  header: {
    fontSize: 20,
    fontFamily: 'Sarasa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Sarasa',
  },
  tabContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 7,
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    // marginRight: 8,
    // marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonActive: {
    elevation: 2,
  },
  navButtonText: {
    fontSize: 12,
    fontFamily: 'Sarasa',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  chartContainer: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  chartHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: 'Sarasa',
  },
  chartValue: {
    fontSize: 18,
    fontFamily: 'Sarasa',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  chartFooterText: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'Sarasa',
  },
  noDataText: {
    textAlign: 'center',
    marginVertical: 50,
    fontFamily: 'Sarasa',
  },
  tooltipContainer: {
    padding: 10,
    borderRadius: 5,
  },
  tooltipTitle: {
    color: 'white',
    fontFamily: 'Sarasa',
  },
  tooltipValue: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Sarasa',
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 16,
  },
  statsHeader: {
    fontSize: 18,
    marginBottom: 16,
    fontFamily: 'Sarasa',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statHeader: {
    padding: 10,
    alignItems: 'center',
  },
  statTitle: {
    color: 'white',
    fontFamily: 'Sarasa',
  },
  statContent: {
    padding: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    opacity: 0.7,
    fontFamily: 'Sarasa',
  },
  statValue: {
    fontFamily: 'Sarasa',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 10,
  },
});
