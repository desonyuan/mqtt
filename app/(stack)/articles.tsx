import React, { useEffect, useState } from 'react';
import { StyleSheet, View, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, useTheme, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/ThemedView';
import ArticleList from '@/components/ArticleList';
import articleApi, { ArticleListItem } from '@/services/articleApi';
import { useAuth } from '@/contexts/AuthContext';

enum UserRole {
  ADMIN = 'admin',
  SENIOR = 'senior',
  NORMAL = 'normal',
}

export default function ArticlesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { userRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasError, setHasError] = useState(false);

  // 获取文章列表
  const fetchArticles = async (page: number = 1, refresh: boolean = false) => {
    try {
      setHasError(false);
      
      const response = await articleApi.getArticles(page);
      
      if (refresh) {
        setArticles(response.data);
      } else {
        setArticles([...articles, ...response.data]);
      }
      
      setCurrentPage(response.current_page);
      setTotalPages(response.total_pages);
      
      return response;
    } catch (error) {
      console.error('获取文章失败:', error);
      setHasError(true);
      return null;
    }
  };

  // 刷新文章列表
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchArticles(1, true);
    setRefreshing(false);
  };

  // 加载更多文章
  const handleLoadMore = async () => {
    if (currentPage < totalPages && !refreshing) {
      await fetchArticles(currentPage + 1);
    }
  };

  // 处理文章点击事件
  const handleArticlePress = (articleId: number) => {
    router.push(`/article/${articleId}`);
  };

  // 处理添加文章
  const handleAddArticle = () => {
    router.push('/article-edit');
  };

  // 初始化加载
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchArticles(1, true);
      setLoading(false);
    };

    initializeData();
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 20 }}>正在加载文章列表...</Text>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text variant="headlineMedium">农业知识</Text>
        </View>

        {hasError ? (
          <View style={styles.errorContainer}>
            <Text>获取文章列表失败</Text>
            <Text variant="bodySmall" style={{ marginTop: 8 }}>请检查网络连接或稍后重试</Text>
          </View>
        ) : (
          <ArticleList
            articles={articles}
            onArticlePress={handleArticlePress}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onEndReached={handleLoadMore}
            emptyMessage="暂无文章"
          />
        )}

        {/* 只有管理员可以添加文章 */}
        {userRole === UserRole.ADMIN && (
          <FAB
            icon="plus"
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            onPress={handleAddArticle}
            color={theme.colors.onPrimary}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 