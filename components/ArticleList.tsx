import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ArticleListItem } from '@/services/articleApi';

// 格式化日期函数
const formatDate = (dateTimeStr: string) => {
  const date = new Date(dateTimeStr);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

// 文章项组件属性
interface ArticleItemProps {
  article: ArticleListItem;
  onPress: (articleId: number) => void;
}

// 文章项组件
const ArticleItem = ({ article, onPress }: ArticleItemProps) => {
  const theme = useTheme();
  
  return (
    <TouchableOpacity onPress={() => onPress(article.article_id)}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.title}>{article.title}</Text>
          <View style={styles.articleFooter}>
            <View style={styles.authorContainer}>
              <MaterialCommunityIcons name="account" size={16} color={theme.colors.outline} />
              <Text variant="bodySmall" style={styles.author}>{article.author_name}</Text>
            </View>
            <Text variant="bodySmall" style={styles.date}>{formatDate(article.created_at)}</Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

// 文章列表组件属性
interface ArticleListProps {
  articles: ArticleListItem[];
  onArticlePress: (articleId: number) => void;
  emptyMessage?: string;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
}

// 文章列表组件
const ArticleList = ({ 
  articles, 
  onArticlePress, 
  emptyMessage = "没有文章",
  loading = false,
  refreshing = false,
  onRefresh,
  onEndReached
}: ArticleListProps) => {
  const theme = useTheme();

  const renderItem = ({ item }: { item: ArticleListItem }) => (
    <ArticleItem article={item} onPress={onArticlePress} />
  );

  if (articles.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons 
          name="file-document-outline" 
          size={64} 
          color={theme.colors.outline} 
        />
        <Text variant="bodyLarge" style={{ color: theme.colors.outline, marginTop: 16 }}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={articles}
      renderItem={renderItem}
      keyExtractor={(item) => item.article_id.toString()}
      contentContainerStyle={styles.listContainer}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  title: {
    marginBottom: 8,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  author: {
    marginLeft: 4,
    opacity: 0.7,
  },
  date: {
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});

export default ArticleList; 