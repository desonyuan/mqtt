import {router} from 'expo-router';
import {mock} from 'mockjs';
import React, {FC, PropsWithChildren} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {List, Text} from 'react-native-paper';
// 生成随机文章
const data = mock({
  'posts|10': [
    // 生成10个 post 项
    {
      'id|+1': 1,
      title: '@ctitle(5, 15)', // 中文标题，5到15个字
      content: '@cparagraph(2, 5)', // 中文段落，2到5段
      author: '@cname', // 随机中文名字
      createdAt: '@datetime', // 日期时间
      'views|100-10000': 1, // 阅读量
      'likes|0-500': 1, // 点赞数
      'tags|1-3': ['@ctitle(2,3)'], // 标签
    },
  ],
});

type Props = {};

const PostBlock: FC<PropsWithChildren<Props>> = (props) => {
  return (
    <View style={styles.container}>
      <View style={styles.postTitleBox}>
        <Text style={styles.title}>农业文章</Text>
        <Pressable
          onPress={() => {
            router.navigate('/(stack)/article/list');
          }}
        >
          <Text>更多</Text>
        </Pressable>
      </View>
      {data.posts.map((item: any, index: number) => {
        return (
          <List.Item
            key={item.id}
            onPress={() => {
              // router.navigate('/post/list');
              router.navigate(`/(stack)/device/${index}`);
            }}
            right={(props) => <List.Icon {...props} icon="arrow-right" />}
            title={item.title}
            description={item.tags.join(',')}
          />
        );
      })}
    </View>
  );
};

export default PostBlock;

const styles = StyleSheet.create({
  container: {
    height: 300,
  },
  postTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
});
