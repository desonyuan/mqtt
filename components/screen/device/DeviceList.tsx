import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import {api} from '@/services/api';
import {$dayjs} from '@/utils/dayjs';
import {usePagination, useRequest} from 'ahooks';
import React, {FC, useState} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {List, Text, useTheme} from 'react-native-paper';

interface MainDevice {
  device_uuid: string;
  is_online: boolean;
  owner_uuid: string;
  time?: string;
}
const pageSize = 20;
interface DeviceType {
  device_name: string;
  device_type: number;
  device_uuid: string;
  is_online: boolean;
  master_uuid: null;
  owner_uuid: string;
  time: null;
}

type IProps = {deviceId: string; master_uuid: string; time: number};

const DeviceList: FC<IProps> = ({deviceId, master_uuid}) => {
  const [slaveDevices, setSlaveDevices] = useState<DeviceType[]>([]);
  const theme = useTheme();
  //  获取设备列表
  const {loading, run, data} = useRequest(async (params) => {
    const res = await api.get('/device/slaves', {
      params: Object.assign({
        // page: params.current,
        // page_size: params.pageSize,
        master_device_uuid: deviceId,
      }),
    });
    const {data} = res;
    return data;
  });
  console.log(data, '1111111111111111111');

  const searchHandle = (page = 1) => {
    run({current: page, pageSize});
  };
  return (
    <View style={styles.container}>
      <CardBox
        containerStyle={{paddingHorizontal: 10}}
        loading={loading}
        // footerComponent={
        //   // 分页
        //   <Pagination
        //     page={1}
        //     onPageChange={searchHandle}
        //     total={1}
        //     label={`第${1}页，共${1}页`}
        //     onSubmitEditing={searchHandle}
        //   />
        // }
      >
        <FlatList
          data={data ?? []}
          contentContainerStyle={{
            paddingVertical: 10,
          }}
          renderItem={({item: device, index}) => {
            const dotColor = device.is_online ? '#4CAF50' : '#9E9E9E';
            const isEvent = index % 2 === 0;
            return (
              <List.Item
                style={{
                  backgroundColor: isEvent ? '#eee' : 'transparent',
                  borderRadius: 10,
                }}
                title={device.device_uuid}
                description={`最后活跃: ${device.time ?? $dayjs().format('YYYY/MM/DD HH:mm:ss')}`}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDescription}
                descriptionNumberOfLines={2}
                right={() => (
                  <View style={styles.itemRightContent}>
                    <View>
                      <Text>在线状态:</Text>
                    </View>
                    <View style={[styles.dot, {backgroundColor: dotColor}]}></View>
                  </View>
                )}
                // onPress={() => handleSelectDevice(device)}
              />
            );
          }}
        />
      </CardBox>
    </View>
  );
};
export default DeviceList;
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  itemRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  listItemTitle: {
    fontFamily: 'Sarasa',
    fontSize: 16,
  },
  listItemDescription: {
    fontFamily: 'Sarasa',
    fontSize: 12,
  },
});
