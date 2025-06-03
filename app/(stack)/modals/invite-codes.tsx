import BottomPopup, {BottomSheetModal} from '@/components/BottomPopup';
import {ThemedText} from '@/components/ThemedText';
import {ThemedView} from '@/components/ThemedView';
import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import {useAuth} from '@/contexts/AuthContext';
import apiService, {api} from '@/services/api';
import {usePagination, useRequest} from 'ahooks';
import * as Clipboard from 'expo-clipboard';
import {useNavigation} from 'expo-router';
import React, {useEffect, useRef, useState} from 'react';
import {Alert, FlatList, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Button, Card, Checkbox, Dialog, IconButton, List, Menu, Portal, Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// 邀请码类型定义
interface InviteCode {
  code: string;
  expires_in: number;
  senior_username: string;
  senior_uuid: string;
}

// 分页响应类型
interface InviteCodesResponse {
  invite_codes: InviteCode[];
  total_pages: number;
  current_page: number;
}

export default function InviteCodesScreen() {
  const {userRole} = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newInviteCode, setNewInviteCode] = useState<string | null>(null);
  const [showNewCodeDialog, setShowNewCodeDialog] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const popRef = useRef<BottomSheetModal>(null);
  const [curInvite, setCurInvite] = useState<InviteCode | null>(null);
  const [selectedInvites, setSelectedInvites] = useState<InviteCode[]>([]);
  const [username, setUsername] = useState('');

  const addOrRemoteSelectedInv = (invite: InviteCode, checked: boolean) => {
    const exist = selectedInvites.find((sin) => sin.code === invite.code);
    if (checked && !exist) {
      setSelectedInvites([...selectedInvites, invite]);
    } else {
      if (!checked && exist) {
        setSelectedInvites(selectedInvites.filter((sin) => sin.code !== invite.code));
      }
    }
  };

  const {
    run: getInviteCodes,
    data: codes,
    mutate,
    params,
  } = usePagination(
    async (params = {current: 1, pageSize: 20}) => {
      const res = await api.get('/admin/invite-codes', {
        params: {
          page: params.current,
          page_size: params.pageSize,
        },
      });
      return res.data;
    },
    {
      manual: true,
    }
  );

  // 删除验证码
  const {runAsync: runDeleteInvite} = useRequest(
    (invite_codes: string[]) => {
      return api.delete('/admin/invite-codes/batch', {
        data: {
          invite_codes,
        },
      });
    },
    {
      manual: true,
    }
  );

  // 生成新邀请码
  const generateInviteCode = async () => {
    try {
      // 调用API生成邀请码
      const response = await apiService.generateInviteCode();

      setNewInviteCode(response.invite_code);
      setShowNewCodeDialog(true);
      const arr = codes?.invite_codes ? [...codes.invite_codes] : [];
      console.log(codes, arr, '11111111');

      mutate({
        current_page: 1,
        total_pages: 1,
        invite_codes: [
          ...arr,
          {
            code: response.invite_code,
            senior_uuid: 'current-user-uuid',
            senior_usename: username,
            expires_in: 86400, // 24小时
          },
        ],
      });
    } catch (err: any) {
      console.error('生成邀请码失败:', err);
      Alert.alert('错误', err.response?.data?.message || '生成邀请码失败');
    }
  };

  // 删除邀请码（管理员功能）
  const deleteInviteCode = async (codes: string[]) => {
    return new Promise((resolve, reject) => {
      let isBatch = codes.length > 1;

      Alert.alert('确认删除', isBatch ? '确定要批量删除邀请码吗？' : `确定要删除邀请码 "${codes[0]}" 吗？`, [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            // setLoading(true);
            try {
              await runDeleteInvite(codes);
              getInviteCodes(params[0]!);
              resolve(true);
              Alert.alert('成功', '邀请码已删除');
            } catch (err: any) {
              console.error('删除邀请码失败:', err);
              reject(err);
              Alert.alert('错误', err.response?.data?.message || '删除邀请码失败');
            }
          },
        },
      ]);
    });
  };

  // 复制邀请码到剪贴板
  const copyToClipboard = async (code?: string) => {
    try {
      await Clipboard.setStringAsync(code ?? curInvite!.code);
      Alert.alert('成功', '邀请码已复制到剪贴板');
    } catch (err) {
      console.error('复制到剪贴板失败:', err);
      Alert.alert('错误', '复制到剪贴板失败');
    }
  };

  // 查看邀请码详情
  const viewCodeInfo = () => {
    setSelectedCode(curInvite!.code);
    setShowInfoDialog(true);
  };

  // 渲染过期时间
  const renderExpiryTime = (expiresIn: number) => {
    const hours = Math.floor(expiresIn / 3600);
    const minutes = Math.floor((expiresIn % 3600) / 60);

    if (hours > 0) {
      return `${hours}小时${minutes > 0 ? ` ${minutes}分钟` : ''}`;
    } else {
      return `${minutes}分钟`;
    }
  };

  useEffect(() => {
    if (userRole === 'senior') {
      apiService.getHello().then(setUsername);
    } else if (userRole === 'admin') {
      getInviteCodes({current: 1, pageSize: 20});
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole === 'senior') {
      navigation.setOptions({
        headerRight() {
          return (
            <Button
              mode="text"
              onPress={generateInviteCode}
              loading={isGenerating}
              disabled={isGenerating}
              style={styles.generateButton}
            >
              生成邀请码
            </Button>
          );
        },
      });
    }
  }, [codes]);

  // 渲染加载状态
  // if (loading && inviteCodes.length === 0) {
  //   return (
  //     <ThemedView style={[styles.container, {paddingTop: insets.top}]}>
  //       <View style={styles.loadingContainer}>
  //         <ActivityIndicator size="large" color="#4CAF50" />
  //         <ThemedText style={[styles.loadingText, {fontFamily: 'Sarasa'}]}>加载邀请码数据...</ThemedText>
  //       </View>
  //     </ThemedView>
  //   );
  // }

  // 处理箭头导航的函数(0-indexed)
  const handlePageChange = (page = 0) => {
    getInviteCodes({current: page + 1, pageSize: 20});
  };

  // 处理输入框跳转的函数(1-indexed)
  const handlePageInput = (page = 1) => {
    getInviteCodes({current: page, pageSize: 20});
  };

  return (
    <ThemedView style={[styles.container, {paddingTop: insets.top}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CardBox
          cardTitle={
            <View style={styles.cardTitleBox}>
              <Text style={styles.cardTitle}>{userRole === 'admin' ? '所有邀请码' : '我的邀请码'}</Text>
              {selectedInvites.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    deleteInviteCode(selectedInvites.map((ins) => ins.code)).then(() => {
                      setSelectedInvites([]);
                    });
                  }}
                >
                  <Text style={styles.batchDeleteButton}>批量删除({selectedInvites.length})</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          footerComponent={
            userRole === 'admin' && codes ? (
              <Pagination
                page={codes?.current_page - 1}
                onPageChange={handlePageChange}
                total={codes?.total_pages}
                label={`第${codes?.current_page}页，共${codes?.total_pages}页`}
                numberOfItemsPerPageList={codes?.invite_codes?.length}
                onSubmitEditing={handlePageInput}
              />
            ) : null
          }
        >
          {codes?.invite_codes.length > 0 ? (
            <FlatList
              data={codes.invite_codes as InviteCode[]}
              keyExtractor={(item) => item.code}
              renderItem={({item}) => (
                <List.Item
                  title={
                    <View>
                      <Text>{`邀请码:${item.code}`}</Text>
                      {userRole !== 'senior' && <Text>创建者:{item.senior_username}</Text>}
                    </View>
                  }
                  titleStyle={{fontFamily: 'Sarasa'}}
                  description={`有效期: ${renderExpiryTime(item.expires_in)}`}
                  descriptionStyle={{fontFamily: 'Sarasa'}}
                  left={(props) => {
                    if (userRole === 'admin') {
                      const checked = selectedInvites.some((ic) => ic.code === item.code);
                      return (
                        <Checkbox
                          status={checked ? 'checked' : 'unchecked'}
                          onPress={() => {
                            addOrRemoteSelectedInv(item, !checked);
                          }}
                        />
                      );
                    }
                    return null;
                  }}
                  right={() => (
                    <View style={styles.menuContainer}>
                      <IconButton
                        icon="dots-vertical"
                        onPress={() => {
                          setCurInvite(item);
                          popRef.current?.present();
                        }}
                      />
                    </View>
                  )}
                />
              )}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <ThemedText style={[styles.emptyText, {fontFamily: 'Sarasa'}]}>
                {userRole !== 'senior' ? '没有可用的邀请码' : '您还没有生成邀请码'}
              </ThemedText>
              {userRole === 'senior' && (
                <Button
                  mode="contained"
                  onPress={generateInviteCode}
                  style={styles.generateEmptyButton}
                  labelStyle={{fontFamily: 'Sarasa'}}
                >
                  生成新邀请码
                </Button>
              )}
            </View>
          )}
        </CardBox>
        <View style={styles.infoContainer}>
          <ThemedText style={[styles.infoTitle, {fontFamily: 'Sarasa'}]}>关于邀请码</ThemedText>
          <ThemedText style={[styles.infoText, {fontFamily: 'Sarasa'}]}>• 邀请码用于邀请普通用户加入系统</ThemedText>
          <ThemedText style={[styles.infoText, {fontFamily: 'Sarasa'}]}>
            • 普通用户注册时需要高级用户的邀请码
          </ThemedText>
          <ThemedText style={[styles.infoText, {fontFamily: 'Sarasa'}]}>• 邀请码有效期为24小时</ThemedText>
          <ThemedText style={[styles.infoText, {fontFamily: 'Sarasa'}]}>• 每个邀请码只能使用一次</ThemedText>
          <ThemedText style={[styles.infoText, {fontFamily: 'Sarasa'}]}>
            • 高级用户可以查看和管理自己的邀请码
          </ThemedText>
          {userRole === 'admin' && (
            <ThemedText style={[styles.infoText, {fontFamily: 'Sarasa'}]}>• 管理员可以查看和管理所有邀请码</ThemedText>
          )}
        </View>
      </ScrollView>

      {/* 邀请码详情对话框 */}
      <Portal>
        <Dialog visible={showInfoDialog} onDismiss={() => setShowInfoDialog(false)}>
          <Dialog.Title style={{fontFamily: 'Sarasa'}}>邀请码详情</Dialog.Title>
          <Dialog.Content>
            {selectedCode && (
              <>
                <View style={styles.codeContainer}>
                  <ThemedText style={[styles.codeText, {fontFamily: 'Sarasa'}]}>{selectedCode}</ThemedText>
                  <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard()}>
                    <ThemedText style={[styles.copyButtonText, {fontFamily: 'Sarasa'}]}>复制</ThemedText>
                  </TouchableOpacity>
                </View>
                <ThemedText style={[styles.codeInfoText, {fontFamily: 'Sarasa'}]}>
                  • 邀请码生成时间: {new Date().toLocaleString()}
                </ThemedText>
                <ThemedText style={[styles.codeInfoText, {fontFamily: 'Sarasa'}]}>• 有效期: 24小时</ThemedText>
                <ThemedText style={[styles.codeInfoText, {fontFamily: 'Sarasa'}]}>• 状态: 未使用</ThemedText>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowInfoDialog(false)} labelStyle={{fontFamily: 'Sarasa'}}>
              关闭
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 新邀请码对话框 */}
      <Portal>
        <Dialog visible={showNewCodeDialog} onDismiss={() => setShowNewCodeDialog(false)}>
          <Dialog.Title style={{fontFamily: 'Sarasa'}}>新邀请码已生成</Dialog.Title>
          <Dialog.Content>
            <ThemedText style={[styles.newCodeText, {fontFamily: 'Sarasa'}]}>您的邀请码已成功生成:</ThemedText>
            <View style={styles.newCodeContainer}>
              <ThemedText style={[styles.newCodeValue, {fontFamily: 'Sarasa'}]}>{newInviteCode}</ThemedText>
            </View>
            <ThemedText style={[styles.newCodeInfo, {fontFamily: 'Sarasa'}]}>
              此邀请码有效期为24小时，请及时分享给需要注册的普通用户。
            </ThemedText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                if (newInviteCode) {
                  copyToClipboard(newInviteCode);
                }
                setShowNewCodeDialog(false);
              }}
              labelStyle={{fontFamily: 'Sarasa'}}
            >
              复制并关闭
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <BottomPopup
        handleIndicatorStyle={{backgroundColor: 'transparent'}}
        ref={popRef}
        snapPoints={[200]}
        handleComponent={null}
      >
        <View style={styles.popContainer}>
          <View style={styles.popMenuBox}>
            <TouchableOpacity
              style={styles.popMenuItem}
              onPress={() => {
                popRef.current?.dismiss();
                copyToClipboard();
              }}
            >
              <Text style={styles.popMenuItemText}>复制邀请码</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popMenuItem}
              onPress={() => {
                popRef.current?.dismiss();
                viewCodeInfo();
              }}
            >
              <Text style={styles.popMenuItemText}>查看详情</Text>
            </TouchableOpacity>
            {userRole === 'admin' && (
              <TouchableOpacity
                style={styles.popMenuItem}
                onPress={() => {
                  popRef.current?.dismiss();
                  deleteInviteCode([curInvite!.code]);
                }}
              >
                <Text style={styles.popMenuItemErrorText}>删除邀请码</Text>
              </TouchableOpacity>
            )}

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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontFamily: 'Sarasa',
  },
  generateButton: {
    borderRadius: 8,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
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
  menuContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  menu: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginBottom: 16,
    opacity: 0.7,
    fontFamily: 'Sarasa',
  },
  generateEmptyButton: {
    marginTop: 8,
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
  infoContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 18,
    marginBottom: 12,
    fontFamily: 'Sarasa',
  },
  infoText: {
    marginBottom: 8,
    fontSize: 14,
    opacity: 0.8,
    fontFamily: 'Sarasa',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 16,
    fontFamily: 'Sarasa',
  },
  copyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Sarasa',
  },
  codeInfoText: {
    marginBottom: 8,
    fontFamily: 'Sarasa',
  },
  newCodeText: {
    marginBottom: 12,
    fontFamily: 'Sarasa',
  },
  newCodeContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  newCodeValue: {
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'Sarasa',
  },
  newCodeInfo: {
    opacity: 0.8,
    fontFamily: 'Sarasa',
  },
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
  cardTitleBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    paddingHorizontal: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  batchDeleteButton: {
    color: 'blue',
  },
});
