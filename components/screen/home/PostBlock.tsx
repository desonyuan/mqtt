import CardBox from '@/components/ui/custom/CardBox';
import {api} from '@/services/api';
import {usePagination} from 'ahooks';
import {router} from 'expo-router';
import React, {forwardRef, useImperativeHandle, ReactNode} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {Button, List, Text} from 'react-native-paper';

type Props = {
  children?: ReactNode;
};

export interface PostBlockRef {
  refresh: () => void;
}

const PostBlock = forwardRef<PostBlockRef, Props>((props, ref) => {
  const {data, refresh} = usePagination(
    async (params) => {
      const res = await api.get('/articles', {
        params: Object.assign({
          page: params.current,
          page_size: params.pageSize,
          search_query: '',
        }),
      });

      return res.data;
    },
    {
      defaultParams: [{current: 1, pageSize: 4}],
    }
  );
  
  // 暴露刷新方法给父组件
  useImperativeHandle(ref, () => ({
    refresh
  }));

  return (
    <View style={styles.container}>
      <CardBox
        headerComponent={
          <View style={styles.postTitleBox}>
            <Text style={styles.title}>农业文章</Text>
            <Button
              onPress={() => {
                router.navigate('/(stack)/article/list');
              }}
            >
              更多
            </Button>
          </View>
        }
      >
        {data?.data?.map((item: any, index: number) => {
          return (
            <List.Item
              key={item.article_id}
              onPress={() => {
                // router.navigate('/post/list');
                router.navigate(`/(stack)/article/view/${item.article_id}`);
              }}
              right={(props) => <List.Icon {...props} icon="eye-arrow-right-outline" />}
              title={
                <View>
                  <Text style={styles.postTitle}>{item.title}</Text>
                  <Text>{item.author_name}</Text>
                </View>
              }
              description={''}
            />
          );
        })}
      </CardBox>
    </View>
  );
});

export default PostBlock;

const styles = StyleSheet.create({
  container: {
    height: 300,
  },
  postTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // width: '100%',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  postItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
