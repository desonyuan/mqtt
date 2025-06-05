import DeviceChart from '@/components/screen/device/DeviceChart';
import DeviceList from '@/components/screen/device/DeviceList';
import DeviceLog from '@/components/screen/device/DeviceLog';
import DeviceTable from '@/components/screen/device/DeviceTable';
import {useLocalSearchParams} from 'expo-router';
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {ToggleButton} from 'react-native-paper';

enum UserRole {
  ADMIN = 'admin',
  SENIOR = 'senior',
  NORMAL = 'normal',
}
interface DeviceType {
  device_name: string;
  device_type: number;
  device_uuid: string;
  is_online: boolean;
  master_uuid: null;
  owner_uuid: string;
  time: null;
}

type TabItem = 'chart' | 'table' | 'log';

const pageSize = 20;

export default function DeviceScreen() {
  const {id, time, masterId} = useLocalSearchParams();
  const deviceId = Array.isArray(id) ? id[0] : id;
  const numericTime = time ? parseInt(Array.isArray(time) ? time[0] : time, 10) : 0;
  const [tab, setTab] = useState<TabItem>('chart');
  console.log(numericTime, 'numericTimenumericTimenumericTime');

  const renderContent = useMemo(() => {
    switch (tab) {
      case 'chart':
        return  <DeviceChart deviceId={deviceId} masterId={masterId as string} time={numericTime} />;
      case 'table':
        return <DeviceTable time={numericTime} deviceId={deviceId} />;
      case 'log':
        return <DeviceLog time={numericTime} deviceId={deviceId} />;
      default:
        return null;
    }
  }, [tab, numericTime,masterId]);

  return (
    <View style={styles.container}>
      <View style={styles.buttonGroup}>
        <ToggleButton.Row onValueChange={(val) => setTab(val as TabItem)} value={tab}>
          <ToggleButton icon="chart-bar" value="chart" />
          <ToggleButton icon="table" value="table" />
          <ToggleButton icon="math-log" value="log" />
        </ToggleButton.Row>
      </View>
      {renderContent}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    alignItems: 'center',
    paddingBottom: 15,
    paddingTop: 20,
  },

  container: {
    flex: 1,
    // padding: 10,
    paddingVertical: 10,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
  },
});
