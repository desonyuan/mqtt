import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Animated, Dimensions, StyleSheet, TouchableOpacity, View} from 'react-native';
import {LineChart} from 'react-native-gifted-charts';

import {ThemedText} from '@/components/ThemedText';
import {useThemeColor} from '@/hooks/useThemeColor';
import {type DataPayload} from '@/proto/data_payload_pb';
import mqttService from '@/services/mqtt';
import {Chip, Surface, useTheme} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ScrollView} from 'react-native-gesture-handler';
import dayjs from 'dayjs';
import { LinearGradient } from 'expo-linear-gradient';

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
  masterId: string;
  time: number;
}

export default function DeviceChart({deviceId, masterId, time}: DeviceChartProps) {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [dataStatus, setDataStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [loading, setLoading] = useState(true);
  const [selectedChartIndex, setSelectedChartIndex] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [animatedValue] = useState(new Animated.Value(0));
  const [animateChart, setAnimateChart] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const theme = useTheme();

  // 获取主题色
  const backgroundColor = theme.colors.background;
  const textColor = theme.colors.onBackground;
  const chartColor = theme.colors.primary;
  const cardColor = theme.colors.surface;
  const chartBgColor = useThemeColor({light: 'rgba(240, 240, 240, 0.8)', dark: 'rgba(30, 30, 30, 0.8)'}, 'background');

  // 定义各个传感器的颜色和单位
  const sensorConfig = [
    {name: '温度', unit: '°C', color: '#FF5252', accessor: (d: SensorData) => d.temperature, icon: '🌡️', gradient: ['#FF5252', '#FF8A80'] as const},
    {name: '湿度', unit: '%', color: '#2196F3', accessor: (d: SensorData) => d.humidity, icon: '💧', gradient: ['#2196F3', '#64B5F6'] as const},
    {name: '光照', unit: 'lux', color: '#FFC107', accessor: (d: SensorData) => d.light, icon: '☀️', gradient: ['#FFC107', '#FFECB3'] as const},
    {name: '土壤湿度', unit: '%', color: '#4CAF50', accessor: (d: SensorData) => d.soil_moisture, icon: '🌱', gradient: ['#4CAF50', '#A5D6A7'] as const},
    {name: ' CO2', unit: 'ppm', color: '#FF9800', accessor: (d: SensorData) => d.co2, icon: '☁️', gradient: ['#FF9800', '#FFCC80'] as const},
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
      // 将设备数据转换为SensorData对象，小于等于-999的值归为0
      const normalizeValue = (value: number) => value <= -999 ? 0 : value;
      
      const newData: SensorData = {
        temperature: normalizeValue(deviceData.temperature),
        humidity: normalizeValue(deviceData.humidity),
        light: normalizeValue(deviceData.light),
        soil_moisture: normalizeValue(deviceData.soilMoisture),
        co2: normalizeValue(deviceData.co2),
        device_uuid: deviceData.deviceUuid,
        timestamp: deviceData.timestamp + time,
      };

      // 更新传感器数据数组，保留最近的数据
      setSensorData((prevData) => {
        const updatedData = [...prevData, newData];
        return updatedData.slice(-MAX_DATA_POINTS); // 只保留最近的MAX_DATA_POINTS个数据点
      });
      
      // 更新最后数据获取时间
      const currentTime = dayjs((deviceData.timestamp + time) * 1000).format('YYYY/MM/DD HH:mm:ss');
      setLastUpdateTime(currentTime);

      setLoading(false);
      setDataStatus('connected');
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    console.log(masterId, 'masterIdmasterIdmasterId');
    if (masterId) {
      mqttService.subscribeDeviceData(masterId, handleSensorData);
      return () => {
        console.log('组件卸载，取消MQTT订阅');
        mqttService.unsubscribe(mqttService.getDataTopic(masterId));
      };
    }
  }, [masterId]);

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

  // 切换到指定的图表
  const switchToChart = (index: number) => {
    if (index !== selectedChartIndex) {
      // 设置动画标志
      setAnimateChart(true);
      
      // 开始动画
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start(() => {
        setSelectedChartIndex(index);
        setAnimateChart(false);
      });
    }
  };

  // 渲染图表
  const renderChart = (sensorIndex: number) => {
    const sensor = sensorConfig[sensorIndex];
    const values = sensorData.map(sensor.accessor);

    // 确保数据有效
    if (!values || values.length === 0) {
      return (
        <Surface style={[styles.chartContainer, { 
          backgroundColor: cardColor, 
          elevation: 4,
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6
        }]}>
          <View style={[styles.noDataContainer]}>
            <ThemedText style={[styles.noDataText, {fontFamily: 'Sarasa'}]}>暂无数据</ThemedText>
            <ThemedText style={[styles.noDataSubText, {fontFamily: 'Sarasa', color: theme.colors.onSurfaceVariant}]}>
              等待设备 {deviceId} 的数据传输...
            </ThemedText>
          </View>
        </Surface>
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
    const chartData = displayData.map((value, index) => {
      // 如果有时间戳，可以添加label
      const dataPoint = {
        value: value || 0,
        label: index % 4 === 0 ? `${index+1}` : '',
        labelTextStyle: { color: textColor, fontSize: 10 }
      };
      return dataPoint;
    });

    return (
      <Animated.View style={{
        opacity: animateChart ? animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0]
        }) : 1,
        transform: [{
          scale: animateChart ? animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.98]
          }) : 1
        }]
      }}>
        <Surface style={[styles.chartContainer, { 
          backgroundColor: cardColor, 
          elevation: 4,
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6
        }]}>
          <View style={[styles.chartHeaderContainer, { 
            borderBottomWidth: 1, 
            borderBottomColor: theme.colors.outline, 
            paddingBottom: 12 
          }]}>
            <View style={styles.chartTitleContainer}>
              <ThemedText style={[styles.chartTitle, {fontFamily: 'Sarasa', color: textColor, fontSize: 18}]}>
                {sensor.icon} {sensor.name}
              </ThemedText>
              <ThemedText style={[styles.chartSubtitle, {fontFamily: 'Sarasa', color: theme.colors.onSurfaceVariant}]}>
                最后更新: {lastUpdateTime || '无数据'}
              </ThemedText>
            </View>
            <LinearGradient 
              colors={sensor.gradient} 
              start={[0, 0]} 
              end={[1, 0]}
              style={styles.valueGradient}
            >
              <View style={[styles.valueContainer]}>
                <ThemedText style={[styles.chartValue, {fontFamily: 'Sarasa', color: '#fff'}]}>
                  {values[values.length - 1]?.toFixed(1) || '-'} {sensor.unit}
                </ThemedText>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.chartWrapper}>
            <LineChart
              areaChart
              curved
              data={chartData}
              rotateLabel
              width={width - 90}
              height={220}
              hideDataPoints={false}
              dataPointsColor={sensor.color}
              dataPointsRadius={3}
              spacing={14}
              color={sensor.color}
              thickness={3}
              startFillColor={sensor.color}
              endFillColor="transparent"
              startOpacity={0.3}
              endOpacity={0.01}
              initialSpacing={0}
              endSpacing={0}
              maxValue={yMax}
              noOfSections={5}
              yAxisLabelSuffix={sensor.unit}
              yAxisTextStyle={{color: textColor, fontSize: 12, fontFamily: 'Sarasa'}}
              yAxisLabelWidth={40}
              xAxisLabelsHeight={20}
              rulesType="solid"
              rulesColor="rgba(200,200,200,0.2)"
              xAxisColor="rgba(200,200,200,0.4)"
              yAxisColor="rgba(200,200,200,0.4)"
              showDataPointOnFocus={true}
              focusEnabled={true}
              showVerticalLines={true}
              verticalLinesColor="rgba(200,200,200,0.2)"
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: sensor.color,
                pointerStripWidth: 2,
                pointerColor: sensor.color,
                radius: 6,
                pointerLabelWidth: 100,
                pointerLabelHeight: 90,
                autoAdjustPointerLabelPosition: true,
                stripOverPointer: true,
                pointerLabelComponent: (items: any) => {
                  const item = items[0];
                  const dataIndex = values.length - displayData.length + (item?.index || 0);
                  const timestamp = dataIndex >= 0 && dataIndex < sensorData.length ? sensorData[dataIndex].timestamp : null;
                  const dateTime = timestamp ? dayjs(timestamp * 1000).format('HH:mm:ss') : '';
                  
                  return (
                    <View style={[styles.tooltipContainer, {backgroundColor: sensor.color}]}>
                      <ThemedText style={[styles.tooltipTitle, {fontFamily: 'Sarasa'}]}>{sensor.name}</ThemedText>
                      <ThemedText style={[styles.tooltipValue, {fontFamily: 'Sarasa'}]}>
                        {item?.value?.toFixed(1)} {sensor.unit}
                      </ThemedText>
                      {dateTime && (
                        <ThemedText style={[styles.tooltipTime, {fontFamily: 'Sarasa'}]}>
                          {dateTime}
                        </ThemedText>
                      )}
                    </View>
                  );
                },
              }}
            />
          </View>

          <View style={[styles.chartFooter, { marginTop: 16, paddingHorizontal: 20, paddingBottom: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                width: 8, 
                height: 8, 
                borderRadius: 4, 
                backgroundColor: dataStatus === 'connected' ? '#4CAF50' : '#9E9E9E',
                marginRight: 6
              }} />
              <ThemedText style={[styles.chartFooterText, {fontFamily: 'Sarasa', color: theme.colors.onSurfaceVariant}]}>
                实时数据 • {displayData.length} 个数据点
              </ThemedText>
            </View>
            <ThemedText style={[styles.chartFooterText, {fontFamily: 'Sarasa', color: theme.colors.onSurfaceVariant}]}>
              设备ID: {deviceId || 'N/A'}
            </ThemedText>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  if (loading && sensorData.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor}]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={chartColor} />
          <ThemedText style={[styles.loadingText, {fontFamily: 'Sarasa'}]}>等待传感器数据...</ThemedText>
          <ThemedText style={[styles.loadingDeviceId, {fontFamily: 'Sarasa', color: theme.colors.onSurfaceVariant}]}>
            设备ID: {deviceId || 'N/A'}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      contentContainerStyle={{
        backgroundColor, 
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: insets.bottom + 16
      }}
      showsVerticalScrollIndicator={false}
      ref={scrollRef}
    >
      <View style={[styles.headerContainer, { marginBottom: 20 }]}>
        <View>
          <ThemedText style={[styles.header, {fontFamily: 'Sarasa', fontSize: 20}]}>
            传感器数据
          </ThemedText>
          {lastUpdateTime && (
            <ThemedText style={[styles.lastUpdateText, {fontFamily: 'Sarasa', color: theme.colors.onSurfaceVariant}]}>
              更新于: {lastUpdateTime}
            </ThemedText>
          )}
        </View>
        <Chip
          mode="outlined"
          style={{
            backgroundColor: getStatusColor(dataStatus), 
            borderColor: getStatusColor(dataStatus),
            opacity: 0.9, 
            elevation: 2,
            borderRadius: 8
          }}
          textStyle={{fontFamily: 'Sarasa', color: '#fff', fontWeight: '600'}}
        >
          {getStatusText(dataStatus)}
        </Chip>
      </View>

      <View style={[styles.tabContainer]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 8 }}
        >
          {sensorConfig.map((sensor, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.navButton,
                selectedChartIndex === index && styles.navButtonActive,
                { 
                  backgroundColor: selectedChartIndex === index ? 'transparent' : theme.colors.surfaceVariant,
                  borderWidth: selectedChartIndex === index ? 0 : 1,
                  borderColor: theme.colors.outline,
                  borderRadius: 16,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  overflow: 'hidden',
                  marginRight: 8,
                  marginBottom: 0,
                  height: 44,
                },
              ]}
              onPress={() => switchToChart(index)}
            >
              {selectedChartIndex === index && (
                <LinearGradient
                  colors={sensor.gradient}
                  start={[0, 0]} 
                  end={[1, 0]}
                  style={[StyleSheet.absoluteFill]}
                />
              )}
              <ThemedText
                style={[
                  styles.navButtonText,
                  { 
                    color: selectedChartIndex === index ? '#FFF' : textColor, 
                    fontFamily: 'Sarasa',
                    fontSize: 16
                  },
                ]}
              >
                {sensor.icon}
              </ThemedText>
              <ThemedText
                style={[
                  styles.navButtonText,
                  { 
                    color: selectedChartIndex === index ? '#FFF' : textColor, 
                    fontFamily: 'Sarasa',
                    fontWeight: '600'
                  },
                ]}
              >
                {sensor.name}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ marginTop: 20, marginBottom: 5 }}>
        {renderChart(selectedChartIndex)}
      </View>

      <Surface style={[styles.statsContainer, {
        backgroundColor: cardColor, 
        elevation: 4, 
        marginTop: 20,
        borderRadius: 16,
        padding: 20
      }]}>
        <ThemedText style={[styles.statsHeader, {
          fontFamily: 'Sarasa',
          fontSize: 20,
          marginBottom: 20,
          color: textColor
        }]}>数据统计</ThemedText>
        
        {sensorData.length > 0 && (
          <View style={styles.statsGrid}>
            {sensorConfig.map((sensor, index) => {
              const values = sensorData.map(sensor.accessor).filter((v) => v !== undefined && v !== null);
              const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
              const max = Math.max(...values);
              const min = Math.min(...values);

              return (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => switchToChart(index)}
                  activeOpacity={0.8}
                  style={[styles.statItemTouchable, { width: '48%' }]}
                >
                  <Surface style={[styles.statItem, {
                    elevation: selectedChartIndex === index ? 4 : 2, 
                    backgroundColor: cardColor,
                    borderRadius: 16,
                    overflow: 'hidden',
                    marginBottom: 16,
                    borderWidth: selectedChartIndex === index ? 2 : 0,
                    borderColor: sensor.color
                  }]}>
                    <LinearGradient 
                      colors={sensor.gradient}
                      start={[0, 0]} 
                      end={[1, 0]}
                      style={styles.statHeaderGradient}
                    >
                      <View style={[styles.statHeader, {
                        paddingVertical: 12
                      }]}>
                        <ThemedText style={[styles.statTitle, {fontFamily: 'Sarasa', fontSize: 16}]}>
                          {sensor.icon} {sensor.name}
                        </ThemedText>
                      </View>
                    </LinearGradient>
                    
                    <View style={[styles.statContent, { padding: 16 }]}>
                      <View style={styles.statRow}>
                        <ThemedText style={[styles.statLabel, {fontFamily: 'Sarasa'}]}>当前值:</ThemedText>
                        <ThemedText style={[styles.statValue, {fontFamily: 'Sarasa', color: sensor.color, fontWeight: 'bold'}]}>
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
                    
                    {selectedChartIndex === index && (
                      <View style={styles.selectedIndicator}>
                        <View style={[styles.selectedDot, { backgroundColor: sensor.color }]} />
                      </View>
                    )}
                  </Surface>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Surface>
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
    paddingHorizontal: 0,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Sarasa',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  lastUpdateText: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
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
  loadingDeviceId: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Sarasa',
    opacity: 0.7,
  },
  tabContainer: {
    marginVertical: 16,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  navButtonActive: {
    elevation: 5,
  },
  navButtonText: {
    fontSize: 13,
    fontFamily: 'Sarasa',
    textAlign: 'center',
  },
  chartContainer: {
    padding: 0,
    borderRadius: 16,
    marginBottom: 0,
    overflow: 'hidden',
  },
  chartHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginBottom: 0,
  },
  chartTitleContainer: {
    flex: 1,
  },
  chartTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Sarasa',
  },
  chartSubtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  valueContainer: {
    borderRadius: 12,
    padding: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  valueGradient: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  chartValue: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Sarasa',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  chartFooterText: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'Sarasa',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noDataText: {
    textAlign: 'center',
    marginVertical: 10,
    fontFamily: 'Sarasa',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noDataSubText: {
    textAlign: 'center',
    fontFamily: 'Sarasa',
    fontSize: 14,
    opacity: 0.7,
  },
  tooltipContainer: {
    padding: 12,
    borderRadius: 8,
    elevation: 5,
  },
  tooltipTitle: {
    color: 'white',
    fontFamily: 'Sarasa',
    fontWeight: 'bold',
  },
  tooltipValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Sarasa',
    marginVertical: 4,
  },
  tooltipTime: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Sarasa',
    opacity: 0.8,
  },
  statsContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statsHeader: {
    fontSize: 20,
    marginBottom: 16,
    fontFamily: 'Sarasa',
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItemTouchable: {
    overflow: 'hidden',
  },
  statItem: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
  },
  statHeaderGradient: {
    width: '100%',
  },
  statHeader: {
    padding: 12,
    alignItems: 'center',
    opacity: 0.9,
  },
  statTitle: {
    color: 'white',
    fontFamily: 'Sarasa',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statContent: {
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    paddingVertical: 5,
    paddingRight: 0,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 4,
  },
  selectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
