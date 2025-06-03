import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, IconButton, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/ThemedView';
import articleApi, { ArticleDetail } from '@/services/articleApi';
import { useAuth } from '@/contexts/AuthContext';

enum UserRole {
  ADMIN = 'admin',
  SENIOR = 'senior',
  NORMAL = 'normal',
}

export default function ArticleEditScreen() {
  const params = useLocalSearchParams();
  const articleId = params.id ? (Array.isArray(params.id) ? parseInt(params.id[0]) : parseInt(params.id)) : null;
  const router = useRouter();
  const theme = useTheme();
  const { userRole } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 获取文章详情（编辑模式）
  const fetchArticleDetail = async () => {
    if (!articleId) return;
    
    setInitialLoading(true);
    try {
      const article = await articleApi.getArticleDetail(articleId);
      setTitle(article.title);
      setContent(article.content);
    } catch (error) {
      console.error('获取文章详情失败:', error);
      setError('无法加载文章详情');
    } finally {
      setInitialLoading(false);
    }
  };

  // 保存文章
  const handleSaveArticle = async () => {
    // 验证表单
    if (!title.trim()) {
      setError('标题不能为空');
      return;
    }
    
    if (!content.trim()) {
      setError('内容不能为空');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (articleId) {
        // 更新文章
        await articleApi.updateArticle(articleId, title.trim(), content.trim());
        setSnackbarMessage('文章更新成功');
      } else {
        // 添加文章
        await articleApi.addArticle(title.trim(), content.trim());
        setSnackbarMessage('文章发布成功');
      }
      
      setSnackbarVisible(true);
      
      // 3秒后返回
      setTimeout(() => {
        router.replace('/articles');
      }, 2000);
    } catch (error) {
      console.error('保存文章失败:', error);
      setError('保存文章失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    if (articleId) {
      fetchArticleDetail();
    }
  }, [articleId]);

  // 非管理员不能访问此页面
  if (userRole !== UserRole.ADMIN) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="auto" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => router.back()}
            />
            <Text variant="titleLarge" style={styles.headerTitle}>
              {articleId ? '编辑文章' : '发布文章'}
            </Text>
          </View>
          
          <View style={styles.errorContainer}>
            <Text>您没有权限访问此页面</Text>
            <Button 
              mode="contained" 
              onPress={() => router.back()} 
              style={{ marginTop: 16 }}
            >
              返回
            </Button>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (initialLoading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="auto" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => router.back()}
            />
            <Text variant="titleLarge" style={styles.headerTitle}>
              编辑文章
            </Text>
          </View>
          
          <View style={styles.loadingContainer}>
            <Text>加载文章内容...</Text>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => router.back()}
            />
            <Text variant="titleLarge" style={styles.headerTitle}>
              {articleId ? '编辑文章' : '发布文章'}
            </Text>
          </View>
          
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TextInput
              label="文章标题"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              error={!!error && !title.trim()}
            />
            
            <TextInput
              label="文章内容"
              value={content}
              onChangeText={setContent}
              mode="outlined"
              multiline
              numberOfLines={12}
              style={styles.contentInput}
              error={!!error && !content.trim()}
            />
            
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            
            <Button
              mode="contained"
              onPress={handleSaveArticle}
              loading={loading}
              disabled={loading || !title.trim() || !content.trim()}
              style={styles.saveButton}
            >
              {articleId ? '更新文章' : '发布文章'}
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
        
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={2000}
        >
          {snackbarMessage}
        </Snackbar>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  contentInput: {
    marginBottom: 16,
    minHeight: 200,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  saveButton: {
    marginBottom: 32,
  },
}); 