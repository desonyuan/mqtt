import DeviceChart from '@/components/screen/device/DeviceChart';
import DeviceList from '@/components/screen/device/DeviceList';
import DeviceLog from '@/components/screen/device/DeviceLog';
import DeviceTable from '@/components/screen/device/DeviceTable';
import {api} from '@/services/api';
import {usePagination} from 'ahooks';
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

type TabItem = 'chart' | 'table' | 'list' | 'log';

const pageSize = 20;

export default function DeviceScreen() {
  const {id, time, user_uuid} = useLocalSearchParams();
  const deviceId = Array.isArray(id) ? id[0] : id;
  const numericTime = time ? parseInt(Array.isArray(time) ? time[0] : time, 10) : 0;
  const [tab, setTab] = useState<TabItem>('chart');

  const renderContent = useMemo(() => {
    switch (tab) {
      case 'chart':
        return <DeviceChart deviceId={deviceId} time={numericTime} />;
      case 'table':
        return <DeviceTable deviceId={deviceId} />;
      case 'log':
        return <DeviceLog deviceId={deviceId} />;
      default:
        return <DeviceList deviceId={deviceId} master_uuid={user_uuid as string} />;
    }
  }, [tab, numericTime, user_uuid]);

  return (
    <View style={styles.container}>
      <View style={styles.buttonGroup}>
        <ToggleButton.Row onValueChange={(val) => setTab(val as TabItem)} value={tab}>
          <ToggleButton icon="chart-bar" value="chart" />
          <ToggleButton icon="table" value="table" />
          <ToggleButton icon="math-log" value="log" />
          <ToggleButton icon="format-list-text" value="list" />
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
  },

  container: {
    flex: 1,
    padding: 10,
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
