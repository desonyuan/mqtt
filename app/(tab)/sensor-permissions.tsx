import BottomPopup, {BottomSheetModal} from '@/components/BottomPopup';
import {ThemedText} from '@/components/ThemedText';
import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import Search from '@/components/ui/custom/Search';
import {useThemeColor} from '@/hooks/useThemeColor';
import {api} from '@/services/api';
import {BottomSheetScrollView, BottomSheetView} from '@gorhom/bottom-sheet';
import {useBoolean, usePagination, useRequest} from 'ahooks';
import React, {useMemo, useRef, useState} from 'react';
import {Alert, FlatList, StyleSheet, View} from 'react-native';
import {ActivityIndicator, Button, Card, Dialog, List, Portal, Text, TextInput} from 'react-native-paper';
import Toast from 'react-native-toast-message';

// 用户类型定义
interface User {
  user_uuid: string;
  username: string;
  role: 'admin' | 'senior' | 'normal';
}

// 嵌入式设备类型定义
interface Device {
  device_type: number;
  device_uuid: string;
  is_online: boolean;
  master_uuid: null;
  owner_uuid: string;
  time: null;
}

// 用户设备权限定义
interface UserDeviceAssignment {
  userId: string;
  deviceId: string;
  deviceUuid: string;
  assignedAt: string;
}
const pageSize = 20;

export default function DevicePermissionsScreen() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const cardColor = useThemeColor({}, 'background');
  const [iptDeviceId, setIptDeviceId] = useState('');
  const popRef = useRef<BottomSheetModal>(null);
  // 弹窗状态
  const [dialogVisible, setDialogVisible] = useBoolean();

  const {
    data: userList,
    pagination,
    run,
    loading: getUserLoading,
  } = usePagination(
    async (params, keyword = '') => {
      const search_query = keyword.trim();
      const res = await api.get('/admin/senior-users', {
        params: Object.assign(
          {
            page: params.current,
            page_size: params.pageSize,
          },
          search_query ? {search_query} : undefined
        ),
      });
      return res.data;
    },
    {
      defaultParams: [{current: 1, pageSize}, searchQuery],
    }
  );
  // 获取用户设备列表
  const {
    loading: getDeviceLoading,
    data: devices,
    run: getUserDevices,
    mutate: setDevices,
  } = useRequest(
    async (uuid: string) => {
      const res = await api.get('/device/admin/devices', {
        params: {
          senior_uuid: uuid,
        },
      });
      return res.data as Device[];
    },
    {
      manual: true,
    }
  );

  // 删除用户设备
  const {loading: delDeviceLoading, run: delDevice} = useRequest(
    async (device_uuid: string, user_uuid: string) => {
      const res = await api.delete('/device/admin/unregister', {data: {device_uuid, user_uuid}});
      return res.data as {message: string};
    },
    {
      manual: true,
      onSuccess(data, params) {
        Toast.show({
          type: 'success',
          text1: '删除设备成功',
          text2: data.message,
        });
        getUserDevices(params[1]);
      },
    }
  );
  // 注册用户设备
  const {loading: registerLoading, run: registerDevice} = useRequest(
    async (device_uuid: string, user_uuid: string) => {
      console.log(device_uuid, user_uuid, '-------调用前打印');
      const res = await api.post('/device/admin/register', {device_uuid, user_uuid});
      return res.data as Device[];
    },
    {
      manual: true,
      onSuccess(data, params) {
        getUserDevices(params[1]);
        Toast.show({
          type: 'success',
          text1: '注册设备成功',
          text2: `设备 ${params[0]} 已分配给用户 ${params[1]}`,
        });
        setDialogVisible.setFalse();
        setIptDeviceId('');
      },
    }
  );
  // 选择用户
  const handleSelectUser = (user: User) => {
    getUserDevices(user.user_uuid);
    setSelectedUser(user);
    popRef.current?.present();
  };

  // 打开设备添加对话框
  const openAddDeviceDialog = (user: User) => {
    setSelectedUser(user);
    setDialogVisible.setTrue();
  };

  // 分配设备给选中的用户
  const assignDeviceToUser = async () => {
    if (!selectedUser) return;
    const device_uuid = iptDeviceId.trim();
    if (device_uuid) {
      registerDevice(device_uuid, selectedUser.user_uuid);
    }
    // Alert.alert('成功', `设备 ${deviceId} 已分配给用户 ${selectedUser.username}`);
  };

  // 获取设备状态的显示样式
  const getStatusColor = (status: 'online' | 'offline' | 'error'): string => {
    switch (status) {
      case 'online':
        return '#4CAF50'; // 绿色
      case 'offline':
        return '#9E9E9E'; // 灰色
      case 'error':
        return '#F44336'; // 红色
      default:
        return '#9E9E9E';
    }
  };

  const DevicesListView = useMemo(() => {
    if (getDeviceLoading) {
      return (
        <BottomSheetView style={styles.loginView}>
          <ActivityIndicator />
        </BottomSheetView>
      );
    } else {
      if (devices) {
        if (devices.length === 0) {
          return (
            <View style={{justifyContent: 'flex-start'}}>
              <Card.Title
                title={`${selectedUser?.username} 的设备列表`}
                subtitle={`共 ${devices?.length} 个设备`}
                titleStyle={styles.cardTitle}
                subtitleStyle={styles.cardSubtitle}
              />
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>该用户尚未分配任何设备</ThemedText>
              </View>
            </View>
          );
        }
        return (
          <BottomSheetScrollView>
            <Card.Title
              title={`${selectedUser?.username} 的设备列表`}
              subtitle={`共 ${devices?.length} 个设备`}
              titleStyle={styles.cardTitle}
              subtitleStyle={styles.cardSubtitle}
            />
            <Card.Content>
              {devices?.map((device) => (
                <List.Item
                  key={device.device_uuid}
                  title={device.device_uuid}
                  description={`UUID: ${device.device_uuid}\n上次活跃: ${device.time}`}
                  titleStyle={styles.listItemTitle}
                  descriptionStyle={styles.listItemDescription}
                  descriptionNumberOfLines={2}
                  right={(props) => (
                    <View>
                      <Button
                        rippleColor="#F44336"
                        mode="outlined"
                        icon="delete"
                        onPress={() => {
                          Alert.alert('警告', '是否移除该设备', [
                            {
                              text: '否',
                            },
                            {
                              text: '是',
                              onPress() {
                                delDevice(device.device_uuid, selectedUser!.user_uuid);
                              },
                            },
                          ]);
                        }}
                        style={styles.removeButton}
                        labelStyle={styles.removeButtonLabel}
                      >
                        移除
                      </Button>
                    </View>
                  )}
                  // style={styles.listItem}
                />
              ))}
            </Card.Content>
          </BottomSheetScrollView>
        );
      }
      return null;
    }
  }, [devices, getDeviceLoading]);

  const searchHandle = (page = 1) => {
    run({current: page, pageSize}, searchQuery);
  };
  return (
    <View style={styles.container}>
      <Search
        value={searchQuery}
        onChangeText={setSearchQuery}
        loading={getUserLoading}
        placeholder="搜索用户..."
        onPress={searchHandle}
        onEndEditing={searchHandle}
      />
      <CardBox
        footerComponent={
          // 分页
          userList && (
            <Pagination
              page={userList?.current_page - 1}
              onPageChange={searchHandle}
              total={userList!.total_pages}
              label={`第${userList?.current_page}页，共${userList?.total_pages}页`}
              numberOfItemsPerPageList={userList?.users.length}
              onSubmitEditing={searchHandle}
            />
          )
        }
      >
        <FlatList
          contentContainerStyle={styles.tableContainer}
          data={userList?.users}
          extraData={selectedUser}
          showsVerticalScrollIndicator={false}
          renderItem={({item, index}) => {
            return (
              <View style={styles.tableItem}>
                <Text>{item.username}</Text>
                <View style={styles.tableItemBox}>
                  <Button mode="text" onPress={() => openAddDeviceDialog(item)}>
                    添加设备
                  </Button>
                  <Button
                    mode="contained-tonal"
                    onPress={() => {
                      handleSelectUser(item);
                    }}
                  >
                    权限配置
                  </Button>
                </View>
              </View>
            );
          }}
        />
      </CardBox>

      <BottomPopup
        handleIndicatorStyle={{backgroundColor: 'transparent'}}
        ref={popRef}
        snapPoints={['50%']}
        as="custom"
      >
        {DevicesListView}
      </BottomPopup>

      {/* 添加设备对话框 */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={setDialogVisible.setFalse}>
          <Dialog.Title>添加设备</Dialog.Title>
          <Dialog.Content>
            <TextInput
              value={iptDeviceId}
              onChangeText={setIptDeviceId}
              mode="outlined"
              label="请输入设备id"
            ></TextInput>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor="rgb(143, 143, 143)" onPress={setDialogVisible.setFalse}>
              取消
            </Button>
            <Button
              onPress={() => {
                assignDeviceToUser();
              }}
            >
              添加
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 10,
    // paddingBottom: 80, // 为FAB留出空间
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
  // scrollContainer: {
  //   padding: 20,
  //   paddingBottom: 80, // 为FAB留出空间
  // },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Sarasa',
  },
  card: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Sarasa',
  },
  cardSubtitle: {
    fontFamily: 'Sarasa',
    fontSize: 12,
  },
  userChips: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  userChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: '#4CAF50',
  },
  listItem: {
    marginVertical: 4,
    borderRadius: 8,
  },
  listItemTitle: {
    fontFamily: 'Sarasa',
    fontSize: 16,
  },
  listItemDescription: {
    fontFamily: 'Sarasa',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
    fontFamily: 'Sarasa',
  },
  removeButton: {
    borderColor: '#F44336',
  },
  removeButtonLabel: {
    color: '#F44336',
    // fontSize: 12,
    fontFamily: 'Sarasa',
  },
  fab: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#4CAF50',
  },
  dialogText: {
    marginBottom: 16,
    fontFamily: 'Sarasa',
  },
  dialogScrollView: {
    maxHeight: 250,
  },
  dialogListItem: {
    paddingVertical: 8,
  },
  tableContainer: {
    rowGap: 16,
    paddingVertical: 10,
  },
  tableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    flex: 1,
    flexShrink: 0,
  },
  tableHeaderItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  paginationTable: {},
  loginView: {
    flex: 1,
    alignItems: 'center',
    // justifyContent: 'center',
    paddingTop: 60,
  },
});
