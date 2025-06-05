import {FlatList, StyleSheet, View} from 'react-native';
import React, {FC, PropsWithChildren, useCallback, useEffect, useState} from 'react';
import Search from '@/components/ui/custom/Search';
import CardBox from '@/components/ui/custom/CardBox';
import {mock} from 'mockjs';
import {Button, List as PList, Text, IconButton, Dialog, Portal, Snackbar} from 'react-native-paper';
import Pagination from '@/components/ui/custom/Pagination';
import {router, useFocusEffect, useNavigation} from 'expo-router';
import {useAuth} from '@/contexts/AuthContext';
import {usePagination} from 'ahooks';
import {api} from '@/services/api';
import articleApi from '@/services/articleApi';
import dayjs from 'dayjs';
type Props = {};
const pageSize = 20;
// 生成随机文章
const data = mock({
  'posts|10': [
    // 生成10个 post 项
    {
      'id|+1': 1,
      title: '@ctitle(5, 15)', // 中文标题，5到15个字
      content: '@cparagraph(2, 5)', // 中文段落，2到5段
      author: '@cname', // 随机中文名字
      createdAt: '@date', // 日期时间
      'views|100-10000': 1, // 阅读量
      'likes|0-500': 1, // 点赞数
      'tags|1-3': ['@ctitle(2,3)'], // 标签
    },
  ],
});
const List: FC<PropsWithChildren<Props>> = (props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState(data.posts);
  const navigation = useNavigation();
  const {userRole} = useAuth();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<number | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const {data: articleData, run: getPost, refresh} = usePagination(
    async (params, keyword = '') => {
      const search_query = keyword.trim();
      const res = await api.get('/articles', {
        params: Object.assign(
          {
            page: params.current,
            page_size: params.pageSize,
          },
          search_query ? search_query : undefined
        ),
      });
      return res.data;
    },
    {
      manual: true,
      defaultParams: [{current: 1, pageSize}, searchQuery],
    }
  );

  useEffect(() => {
    if (userRole === 'admin') {
      navigation.setOptions({
        headerRight() {
          return (
            <Button
              onPress={() => {
                router.navigate('/(stack)/article/crate');
              }}
            >
              发布文章
            </Button>
          );
        },
      });
    }
  }, [userRole]);

  const searchHandle = (page = 1) => {
    getPost({current: page, pageSize}, searchQuery);
  };

  const handleDeleteArticle = async () => {
    if (articleToDelete) {
      try {
        await articleApi.deleteArticle(articleToDelete);
        setSnackbarMessage('文章删除成功');
        setSnackbarVisible(true);
        refresh(); // 刷新文章列表
      } catch (error) {
        console.error('删除文章失败:', error);
        setSnackbarMessage('删除文章失败');
        setSnackbarVisible(true);
      } finally {
        setDeleteDialogVisible(false);
        setArticleToDelete(null);
      }
    }
  };

  const showDeleteDialog = (articleId: number) => {
    setArticleToDelete(articleId);
    setDeleteDialogVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      searchHandle();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Search
        value={searchQuery}
        onChangeText={setSearchQuery}
        // loading={getUserLoading}
        placeholder="搜索文章..."
        // onPress={searchHandle}
        onEndEditing={searchHandle}
      />
      <CardBox
        scrollable={false}
        footerComponent={
          // 分页
          articleData && (
            <Pagination
              page={1}
              onPageChange={() => {}}
              total={articleData?.data?.length}
              label={`第${1}页，共${1}页`}
              // numberOfItemsPerPageList={22}
              onSubmitEditing={searchHandle}
            />
          )
        }
      >
        <FlatList
          data={articleData?.data}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingVertical: 10}}
          renderItem={({item, index}) => {
            const isEvent = index % 2 === 0;

            return (
              <PList.Item
                onPress={() => {
                  router.navigate(`/(stack)/article/view/${item.article_id}`);
                }}
                style={{
                  backgroundColor: isEvent ? '#eee' : 'transparent',
                  borderRadius: 10,
                }}
                key={item.id}
                right={(props) => {
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {userRole === 'admin' && (
                        <>
                          <IconButton
                            icon="pencil"
                            size={20}
                            onPress={(e) => {
                              e.stopPropagation();
                              router.navigate({
                                pathname: `/(stack)/article/edit/[id]`,
                                params: { id: item.article_id }
                              });
                            }}
                          />
                          <IconButton
                            icon="delete"
                            size={20}
                            onPress={(e) => {
                              e.stopPropagation();
                              showDeleteDialog(item.article_id);
                            }}
                          />
                        </>
                      )}
                      <Text>{item.created_at.split(' ')[0]}</Text>
                    </View>
                  );
                }}
                title={item.title}
                // description={item.tags.join(',')}
              />
            );
          }}
        />
      </CardBox>

      {/* 删除确认对话框 */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>删除文章</Dialog.Title>
          <Dialog.Content>
            <Text>确定要删除这篇文章吗？此操作不可撤销。</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>取消</Button>
            <Button onPress={handleDeleteArticle}>确认删除</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 提示消息 */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

export default List;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    // paddingBottom: 80, // 为FAB留出空间
  },
});
