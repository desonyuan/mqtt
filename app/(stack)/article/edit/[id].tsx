import React, { FC, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, TextInput, ActivityIndicator, Text } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import articleApi from '@/services/articleApi';

const EditArticle: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = parseInt(id || '0');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取文章详情
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setInitialLoading(true);
        const article = await articleApi.getArticleDetail(articleId);
        setTitle(article.title);
        setContent(article.content);
        setError(null);
      } catch (error) {
        console.error('获取文章详情失败:', error);
        setError('获取文章详情失败，请稍后重试');
      } finally {
        setInitialLoading(false);
      }
    };

    if (articleId > 0) {
      fetchArticle();
    } else {
      setError('无效的文章ID');
      setInitialLoading(false);
    }
  }, [articleId]);

  // 更新文章
  const handleUpdate = async () => {
    if (!title) {
      Toast.show({ type: 'error', text1: '错误', text2: '标题不能为空' });
      return;
    }
    if (!content || content.length < 10) {
      Toast.show({ type: 'error', text1: '错误', text2: '文章内容不能小于10个字符' });
      return;
    }

    try {
      setLoading(true);
      await articleApi.updateArticle(articleId, title, content);
      Toast.show({
        type: 'success',
        text1: '更新成功',
        text2: '文章已成功更新'
      });
      router.back();
    } catch (error) {
      console.error('更新文章失败:', error);
      Toast.show({
        type: 'error',
        text1: '更新失败',
        text2: '文章更新失败，请稍后重试'
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>加载文章内容...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: 'red' }}>{error}</Text>
        <Button mode="contained" style={{ marginTop: 20 }} onPress={() => router.back()}>
          返回
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="文章标题"
        value={title}
        onChangeText={(text) => {
          setTitle(text.trim());
        }}
      />
      <TextInput
        multiline
        style={styles.contentIpt}
        value={content}
        onChangeText={setContent}
        verticalAlign="top"
        placeholder="文章内容"
      />
      <Button onPress={handleUpdate} loading={loading} mode="contained">
        更新文章
      </Button>
    </View>
  );
};

export default EditArticle;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    gap: 20,
  },
  contentIpt: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 