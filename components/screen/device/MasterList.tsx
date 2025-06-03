import BottomPopup from '@/components/BottomPopup';
import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import Search from '@/components/ui/custom/Search';
import {$dayjs} from '@/utils/dayjs';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import React, {FC, useRef, useState} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {List, Text, ToggleButton} from 'react-native-paper';

enum UserRole {
  ADMIN = 'admin',
  SENIOR = 'senior',
  NORMAL = 'normal',
}
interface MainDevice {
  device_uuid: string;
  is_online: boolean;
  owner_uuid: string;
  time?: string;
}

type Props = {
  list: MainDevice[];
};
const MasterList: FC<Props> = ({list}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const popRef = useRef<BottomSheetModal>(null);

  return (
    <View style={styles.container}>
      <Search value={searchQuery} onChangeText={setSearchQuery} placeholder="请输入主设备id" />
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
          data={list}
          contentContainerStyle={{
            paddingVertical: 10,
          }}
          renderItem={({item: device, index}) => {
            const dotColor = device.is_online ? '#4CAF50' : '#9E9E9E';
            const isEvent = index % 2 === 0;
            return (
              <List.Item
                onPress={() => {
                  popRef.current?.present();
                }}
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
      <BottomPopup
        handleComponent={() => {
          return (
            <ToggleButton.Row onValueChange={(value) => {}} value={'left'}>
              <ToggleButton icon="format-align-left" value="left" />
              <ToggleButton icon="format-align-right" value="right" />
            </ToggleButton.Row>
          );
        }}
        ref={popRef}
        snapPoints={['50%']}
        // as="custom"
      >
        <View></View>
      </BottomPopup>
    </View>
  );
};
export default MasterList;
const styles = StyleSheet.create({
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
