import BottomPopup, {BottomSheetModal} from '@/components/BottomPopup';
import {ThemedText} from '@/components/ThemedText';
import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import Search from '@/components/ui/custom/Search';
import {useThemeColor} from '@/hooks/useThemeColor';
import apiService, {api, hashPassword} from '@/services/api';
import {usePagination, useSetState} from 'ahooks';
import {useNavigation} from 'expo-router';
import React, {useEffect, useRef, useState} from 'react';
import {Alert, FlatList, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Button, DataTable, Dialog, Icon, MD3Colors, Portal, Text, TextInput, useTheme} from 'react-native-paper';

// 用户类型定义
interface User {
  user_uuid: string;
  username: string;
  user_type: string;
  manager_uuid?: string;
}

// 分页数据类型
interface UsersResponse {
  users: User[];
  total_pages: number;
  current_page: number;
}
const pageSize = 20;

export default function UserAdminScreen() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');

  const [searchQuery, setSearchQuery] = useState('');

  // 新用户表单状态
  const [addUserForm, setAddUserForm] = useSetState<Record<string, any>>({
    user_type: 'normal',
    username: '',
    password: '',
    manager_uuid: undefined,
  });
  // 编辑用户表单状态
  const [editPassword, setEditPassword] = useState('');
  const [editCheckPassword, setEditCheckPassword] = useState('');
  const [editUserType, setEditUserType] = useState<string>('normal');
  const [editManagerUuid, setEditManagerUuid] = useState('');
  //
  const navigation = useNavigation();
  const popRef = useRef<BottomSheetModal>(null);
  const [curUser, setCurUser] = useState<User | null>(null);

  // 获取用户数据
  const {
    data,
    pagination,
    run: getUsers,
    loading: getUserLoading,
    params,
  } = usePagination(
    async (params, keyword = '') => {
      const search_query = keyword.trim();
      const res = await api.get('/admin/users', {
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

  // 添加新用户
  const handleAddUser = async () => {
    if (!addUserForm.username || !addUserForm.password) {
      Alert.alert('错误', '用户名和密码不能为空');
      return;
    }

    if (addUserForm.password.length < 6) {
      Alert.alert('错误', '密码长度至少为6位');
      return;
    }

    try {
      // 修正添加用户API调用
      await apiService.addUser(addUserForm);

      // 重置表单并关闭对话框
      setShowAddDialog(false);

      // 刷新用户列表
      getUsers(params[0]!, params[1]!);

      // 提示成功
      Alert.alert('成功', '用户已添加');
    } catch (err: any) {
      console.error('添加用户失败:', err);
      Alert.alert('错误', err.response?.data?.message || '添加用户失败');
    } finally {
      // setLoading(false);
    }
  };

  // 编辑用户
  const handleEditUser = async () => {
    if (editPassword && editCheckPassword === editPassword || editPassword === '') {
      let password_hash: string | undefined = undefined;
      if (editPassword !== '') {
        password_hash = await hashPassword(curUser!.username, editPassword);
      }
      try {
        await apiService.updateUser(curUser!.user_uuid, {
          username: curUser!.username,
          password_hash,
          user_type: editUserType,
          manager_uuid: editUserType === 'normal' ? editManagerUuid : undefined,
        });

        // 关闭对话框
        setShowEditDialog(false);
        // 刷新用户列表
        getUsers(params[0]!, params[1]!);
        // 提示成功
        Alert.alert('成功', '用户信息已更新');
      } catch (err: any) {
        console.error('更新用户失败:', err);
        Alert.alert('错误', err.response?.data?.message || '更新用户失败');
      }
    } else {
      Alert.alert('错误', '两次输入密码不一致');
    }
  };

  // 删除用户
  const handleDeleteUser = () => {
    Alert.alert('确认删除', `确定要删除用户 "${curUser!.username}" 吗？此操作不可撤销。`, [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.deleteUser(curUser!.user_uuid);
            // 刷新用户列表
            getUsers(params[0]!, params[1]!);
            // 提示成功
            Alert.alert('成功', '用户已删除');
          } catch (err: any) {
            console.error('删除用户失败:', err);
            Alert.alert('错误', err.response?.data?.message || '删除用户失败');
          } finally {
            // setLoading(false);
            popRef.current?.dismiss();
            setCurUser(null);
          }
        },
      },
    ]);
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight() {
        return (
          <Button icon="plus" onPress={() => setShowAddDialog(true)}>
            <Text>添加用户</Text>
          </Button>
        );
      },
    });
  }, []);

  const searchHandle = (page = 1) => {
    getUsers({current: page, pageSize}, searchQuery);
  };

  return (
    <View style={[styles.container, {backgroundColor}]}>
      <Search placeholder="搜索用户..." onChangeText={setSearchQuery} value={searchQuery} onEndEditing={searchHandle} />
      <CardBox
        footerComponent={
          <Pagination
            page={data?.current_page - 1}
            onPageChange={(page) => {
              searchHandle(page + 1);
            }}
            total={data?.total_pages}
            label={`第${data?.current_page}页，共${data?.total_pages}页`}
            numberOfItemsPerPageList={data?.users.length}
            onSubmitEditing={searchHandle}
          />
        }
      >
        <DataTable.Header>
          <DataTable.Title>用户名</DataTable.Title>
          <DataTable.Title>类型</DataTable.Title>
          <DataTable.Title numeric>操作</DataTable.Title>
        </DataTable.Header>

        <FlatList
          data={data?.users}
          showsVerticalScrollIndicator={false}
          renderItem={({item}) => {
            return (
              <DataTable.Row key={item.user_uuid}>
                <DataTable.Cell>{item.username}</DataTable.Cell>
                <DataTable.Cell>{item.user_type}</DataTable.Cell>
                <DataTable.Cell
                  numeric
                  onPress={() => {
                    setCurUser(item);
                    popRef.current?.present();
                  }}
                  rippleColor={'transparent'}
                >
                  <Icon source="dots-horizontal" color={MD3Colors.neutralVariant70} size={20} />
                </DataTable.Cell>
              </DataTable.Row>
            );
          }}
        />
      </CardBox>
      <BottomPopup
        handleIndicatorStyle={{backgroundColor: 'transparent'}}
        ref={popRef}
        snapPoints={[200]}
        handleComponent={null}
        // detached
        // bottomInset={50}
        // backgroundStyle={{backgroundColor: 'transparent'}}
        // as="custom"
      >
        <View style={styles.popContainer}>
          <View style={styles.popMenuBox}>
            <TouchableOpacity
              style={styles.popMenuItem}
              onPress={() => {
                setEditManagerUuid(curUser?.manager_uuid || '');
                setEditUserType(curUser?.user_type || '');
                setShowEditDialog(true);
                popRef.current?.dismiss();
              }}
            >
              <Text style={styles.popMenuItemText}>编辑</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.popMenuItem} onPress={handleDeleteUser}>
              <Text style={styles.popMenuItemErrorText}>删除</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popMenuCancelItem}
              onPress={() => {
                popRef.current?.dismiss();
              }}
            >
              <Text style={[styles.popMenuItemText, {color: '#9E9E9E'}]}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomPopup>
      {/* 用户列表或加载状态 */}
      {/* {renderContent()} */}

      {/* 悬浮按钮 - 添加新用户 */}
      {/* <FAB icon="plus" style={styles.fab} onPress={() => setShowAddDialog(true)} /> */}

      {/* 添加用户对话框 */}
      <Portal>
        <Dialog visible={showAddDialog} onDismiss={() => setShowAddDialog(false)}>
          <Dialog.Title>添加新用户</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView contentContainerStyle={styles.dialogScrollContent}>
              <TextInput
                label="用户名"
                value={addUserForm.username}
                // onChangeText={setNewUsername}
                onChangeText={(username) => {
                  setAddUserForm({username});
                }}
                style={styles.dialogInput}
                mode="outlined"
                dense
              />
              <TextInput
                label="密码"
                value={addUserForm.password}
                onChangeText={(password) => {
                  setAddUserForm({password});
                }}
                secureTextEntry
                style={styles.dialogInput}
                mode="outlined"
                dense
              />
              <View style={styles.userTypeContainer}>
                <ThemedText style={styles.userTypeLabel}>用户类型:</ThemedText>
                <View style={styles.segmentedButtons}>
                  <Button
                    mode={addUserForm.user_type === 'normal' ? 'contained' : 'outlined'}
                    // onPress={() => setNewUserType('normal')}
                    onPress={() => {
                      setAddUserForm({user_type: 'normal'});
                    }}
                    style={styles.userTypeButton}
                    labelStyle={{fontSize: 12}}
                    compact
                  >
                    普通用户
                  </Button>
                  <Button
                    mode={addUserForm.user_type === 'senior' ? 'contained' : 'outlined'}
                    // onPress={() => setNewUserType('senior')}
                    onPress={() => {
                      setAddUserForm({user_type: 'senior', manager_uuid: undefined});
                    }}
                    style={styles.userTypeButton}
                    labelStyle={{fontSize: 12}}
                    compact
                  >
                    高级用户
                  </Button>
                  <Button
                    mode={addUserForm.user_type === 'admin' ? 'contained' : 'outlined'}
                    // onPress={() => setNewUserType('admin')}
                    onPress={() => {
                      setAddUserForm({user_type: 'admin', manager_uuid: undefined});
                    }}
                    style={styles.userTypeButton}
                    labelStyle={{fontSize: 12}}
                    compact
                  >
                    管理员
                  </Button>
                </View>
              </View>
              {addUserForm.user_type === 'normal' && (
                <TextInput
                  label="管理者UUID (可选)"
                  value={addUserForm.manager_uuid}
                  // onChangeText={setNewManagerUuid}
                  onChangeText={(manager_uuid) => {
                    setAddUserForm({manager_uuid});
                  }}
                  style={styles.dialogInput}
                  mode="outlined"
                  dense
                />
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowAddDialog(false)}>取消</Button>
            <Button onPress={handleAddUser}>添加</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 编辑用户对话框 */}
      <Portal>
        <Dialog visible={showEditDialog} onDismiss={() => setShowEditDialog(false)}>
          <Dialog.Title>编辑用户</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView contentContainerStyle={styles.dialogScrollContent}>
              <TextInput label="用户名" disabled value={curUser?.username} style={styles.dialogInput} mode="outlined" />
              <TextInput
                label="修改密码"
                value={editPassword}
                onChangeText={setEditPassword}
                style={styles.dialogInput}
                secureTextEntry
                mode="outlined"
              />
              <TextInput
                label="确认密码"
                value={editCheckPassword}
                onChangeText={setEditCheckPassword}
                style={styles.dialogInput}
                mode="outlined"
                secureTextEntry
              />
              <View style={styles.userTypeContainer}>
                <ThemedText style={styles.userTypeLabel}>用户类型:</ThemedText>
                <View style={styles.segmentedButtons}>
                  <Button
                    mode={editUserType === 'normal' ? 'contained' : 'outlined'}
                    onPress={() => setEditUserType('normal')}
                    style={styles.userTypeButton}
                    labelStyle={{fontSize: 12}}
                    compact
                  >
                    普通用户
                  </Button>
                  <Button
                    mode={editUserType === 'senior' ? 'contained' : 'outlined'}
                    onPress={() => setEditUserType('senior')}
                    style={styles.userTypeButton}
                    labelStyle={{fontSize: 12}}
                    compact
                  >
                    高级用户
                  </Button>
                  <Button
                    mode={editUserType === 'admin' ? 'contained' : 'outlined'}
                    onPress={() => setEditUserType('admin')}
                    style={styles.userTypeButton}
                    labelStyle={{fontSize: 12}}
                    compact
                  >
                    管理员
                  </Button>
                </View>
              </View>
              {editUserType === 'normal' && (
                <TextInput
                  label="管理者UUID (可选)"
                  value={editManagerUuid}
                  onChangeText={setEditManagerUuid}
                  style={styles.dialogInput}
                  mode="outlined"
                  dense
                />
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowEditDialog(false)}>取消</Button>
            <Button onPress={handleEditUser}>保存</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  scrollContainer: {
    padding: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Sarasa',
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
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
  menuContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 50,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#4CAF50',
    elevation: 8,
    zIndex: 999,
  },
  dialogInput: {
    marginBottom: 12,
    height: 50,
    backgroundColor: 'transparent',
  },
  errorContainer: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Sarasa',
  },
  retryButton: {
    marginTop: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    borderRadius: 8,
    marginBottom: 8,
  },
  searchOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  chip: {
    marginRight: 8,
    marginBottom: 4,
  },
  searchButton: {
    marginLeft: 'auto',
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    opacity: 0.7,
    fontFamily: 'Sarasa',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  paginationText: {
    fontFamily: 'Sarasa',
  },
  resetPasswordText: {
    marginBottom: 16,
    fontFamily: 'Sarasa',
  },
  dialogText: {
    marginBottom: 16,
    fontFamily: 'Sarasa',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  clearButton: {
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userCard: {
    marginBottom: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  pageText: {
    fontSize: 13,
    fontFamily: 'Sarasa',
  },
  userTypeContainer: {
    flexDirection: 'column',
    marginVertical: 12,
  },
  segmentedButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  userTypeButton: {
    marginRight: 0,
    marginBottom: 10,
    height: 40,
    alignSelf: 'flex-start',
  },
  userTypeLabel: {
    marginRight: 8,
    fontFamily: 'Sarasa',
    marginBottom: 4,
  },
  dialogContent: {
    padding: 14,
    maxHeight: 400,
  },
  dialogScrollArea: {
    height: 350,
    paddingHorizontal: 0,
  },
  dialogScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  popup: {
    padding: 16,
    width: 200,
    right: -15,
  },
  dialogTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  dialogButtonText: {},
  popContainer: {
    // padding: 10,
  },
  popMenuBox: {
    alignItems: 'center',
    // backgroundColor: 'white',
    // borderRadius: 10,
  },
  popMenuItem: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomColor: '#eee',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  popMenuCancelItem: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 15,
    // borderBottomColor: '#eee',
    // marginTop: 20,
    // borderBottomWidth: StyleSheet.hairlineWidth,
  },
  popMenuItemText: {
    fontSize: 16,
    color: 'blue',
  },
  popMenuItemErrorText: {
    fontSize: 16,
    color: 'red',
  },
  popMenuItemCancelText: {
    fontSize: 16,
    color: 'red',
  },
});
