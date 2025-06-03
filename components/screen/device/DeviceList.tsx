import {ThemedView} from '@/components/ThemedView';
import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import {api} from '@/services/api';
import {$dayjs} from '@/utils/dayjs';
import {useRequest} from 'ahooks';
import React, {FC} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, View} from 'react-native';
import {List, Text, useTheme} from 'react-native-paper';

interface MainDevice {
  device_uuid: string;
  is_online: boolean;
  owner_uuid: string;
  time?: string;
}

type Props = {
  // list: MainDevice[];
};
const DeviceList: FC<Props> = ({}) => {
  // const [searchQuery, setSearchQuery] = useState('');
  const theme = useTheme();
  //  获取设备列表
  const {data, loading} = useRequest(async () => {
    const res = await api.get('/device');
    return res.data as MainDevice[];
  }, {});

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{marginTop: 20}}>加载设备数据...</Text>
      </ThemedView>
    );
  }
  return (
    <View style={styles.container}>
      {/* <Search value={searchQuery} onChangeText={setSearchQuery} placeholder="请输入主设备id" /> */}
      <CardBox
        footerComponent={
          // 分页
          <Pagination
            page={1}
            onPageChange={() => {}}
            total={1}
            label={`第${1}页，共${1}页`}
            numberOfItemsPerPageList={2}
            onSubmitEditing={() => {}}
          />
        }
      >
        <FlatList
          data={data}
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
