import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {LineChart} from 'react-native-gifted-charts';

import {ThemedText} from '@/components/ThemedText';
import {useThemeColor} from '@/hooks/useThemeColor';
import {SensorData, realTimeChart} from '@/utils/mockData';
import {useFocusEffect} from 'expo-router';
import {Chip} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const MAX_DATA_POINTS = 20; // 显示最近20个数据点
const {width} = Dimensions.get('window');

export default function DeviceChart() {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [mockStatus, setMockStatus] = useState<'running' | 'stopped'>('stopped');
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

  // 监听页面焦点变化
  useFocusEffect(
    React.useCallback(() => {
      // 页面获得焦点时启动模拟数据生成
      console.log('页面获得焦点，启动模拟数据生成');
      startDataGeneration();

      // 清理函数，页面失去焦点时执行
      return () => {
        console.log('页面失去焦点，停止模拟数据生成');
        stopDataGeneration();
      };
    }, [])
  );

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      console.log('组件卸载，停止模拟数据生成');
      stopDataGeneration();
    };
  }, []);

  // 启动模拟数据生成
  const startDataGeneration = () => {
    // 开始生成模拟数据
    realTimeChart.startGenerating(1000, 5);
    setMockStatus('running');
    setLoading(false);

    // 设置定时器获取数据
    const intervalId = setInterval(() => {
      setSensorData(realTimeChart.getData());
    }, 1000);

    // 保存intervalId以便后续清除
    (window as any).sensorDataInterval = intervalId;
  };

  // 停止模拟数据生成
  const stopDataGeneration = () => {
    realTimeChart.stopGenerating();
    setMockStatus('stopped');

    // 清除定时器
    if ((window as any).sensorDataInterval) {
      clearInterval((window as any).sensorDataInterval);
      (window as any).sensorDataInterval = null;
    }
  };

  // 手动重启数据生成
  const handleRestart = () => {
    setLoading(true);
    stopDataGeneration();
    setTimeout(() => {
      startDataGeneration();
    }, 500);
  };

  // 获取状态的显示样式
  const getStatusColor = (status: 'running' | 'stopped'): string => {
    switch (status) {
      case 'running':
        return '#4CAF50'; // 绿色
      case 'stopped':
        return '#9E9E9E'; // 灰色
      default:
        return '#9E9E9E';
    }
  };

  // 获取状态的显示文本
  const getStatusText = (status: 'running' | 'stopped'): string => {
    switch (status) {
      case 'running':
        return '数据生成中';
      case 'stopped':
        return '已停止';
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
            模拟数据 • {displayData.length} 个数据点
          </ThemedText>
          <ThemedText style={[styles.chartFooterText, {fontFamily: 'Sarasa'}]}>
            设备ID: {sensorData[0]?.device_uuid || 'N/A'}
          </ThemedText>
        </View>
      </View>
    );
  };

  if (loading && sensorData.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor}]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={chartColor} />
          <ThemedText style={[styles.loadingText, {fontFamily: 'Sarasa'}]}>生成模拟传感器数据...</ThemedText>
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
          style={{backgroundColor: getStatusColor(mockStatus), opacity: 0.8}}
          textStyle={{fontFamily: 'Sarasa', color: '#fff'}}
          onPress={handleRestart}
        >
          {getStatusText(mockStatus)}
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
