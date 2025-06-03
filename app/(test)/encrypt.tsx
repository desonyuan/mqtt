import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Button, Text, TextInput, Card, Divider, IconButton } from 'react-native-paper';
import { ThemedView } from '@/components/ThemedView';
import { hashPassword, verifyPassword } from '@/services/api';
import * as Clipboard from 'expo-clipboard';

export default function EncryptScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hashedPassword, setHashedPassword] = useState('');
  const [verifyUsername, setVerifyUsername] = useState('');
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [verifyPasswordVisible, setVerifyPasswordVisible] = useState(false);

  const handleEncrypt = async () => {
    if (!username || !password) {
      Alert.alert('错误', '请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const hash = await hashPassword(username, password);
      setHashedPassword(hash);
    } catch (error) {
      console.error('加密失败:', error);
      Alert.alert('错误', '加密失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyUsername || !verifyInput || !hashedPassword) {
      Alert.alert('错误', '请输入用户名、密码和哈希值');
      return;
    }

    setVerifyLoading(true);
    try {
      const result = await verifyPassword(verifyUsername, verifyInput, hashedPassword);
      setVerifyResult(result);
    } catch (error) {
      console.error('验证失败:', error);
      Alert.alert('错误', '验证失败，请重试');
    } finally {
      setVerifyLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!hashedPassword) {
      Alert.alert('错误', '没有可复制的哈希值');
      return;
    }
    
    await Clipboard.setStringAsync(hashedPassword);
    Alert.alert('成功', '哈希值已复制到剪贴板');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="headlineMedium" style={styles.title}>
            密码加密工具
          </Text>
          
          <Card style={styles.card}>
            <Card.Title title="加密密码" />
            <Card.Content>
              <TextInput
                mode="outlined"
                label="输入用户名"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
              />
              <TextInput
                mode="outlined"
                label="输入密码"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                style={styles.input}
                right={
                  <TextInput.Icon 
                    icon={passwordVisible ? "eye-off" : "eye"} 
                    onPress={() => setPasswordVisible(!passwordVisible)} 
                  />
                }
              />
              
              <Button 
                mode="contained" 
                onPress={handleEncrypt}
                loading={loading}
                disabled={loading || !username || !password}
                style={styles.button}
              >
                加密
              </Button>
              
              {hashedPassword ? (
                <View style={styles.hashContainer}>
                  <Text variant="titleMedium">加密结果:</Text>
                  <View style={styles.hashResultContainer}>
                    <Text style={styles.hashText} selectable>
                      {hashedPassword}
                    </Text>
                    <IconButton 
                      icon="content-copy" 
                      size={20} 
                      onPress={copyToClipboard} 
                      style={styles.copyIcon}
                    />
                  </View>
                </View>
              ) : null}
            </Card.Content>
          </Card>
          
          <Divider style={styles.divider} />
          
          <Card style={styles.card}>
            <Card.Title title="验证密码" />
            <Card.Content>
              <TextInput
                mode="outlined"
                label="输入用户名"
                value={verifyUsername}
                onChangeText={setVerifyUsername}
                style={styles.input}
              />
              <TextInput
                mode="outlined"
                label="输入验证密码"
                value={verifyInput}
                onChangeText={setVerifyInput}
                secureTextEntry={!verifyPasswordVisible}
                style={styles.input}
                right={
                  <TextInput.Icon 
                    icon={verifyPasswordVisible ? "eye-off" : "eye"} 
                    onPress={() => setVerifyPasswordVisible(!verifyPasswordVisible)} 
                  />
                }
              />
              
              <Button 
                mode="contained" 
                onPress={handleVerify}
                loading={verifyLoading}
                disabled={verifyLoading || !verifyUsername || !verifyInput || !hashedPassword}
                style={styles.button}
              >
                验证
              </Button>
              
              {verifyResult !== null && (
                <Text 
                  variant="titleMedium" 
                  style={[
                    styles.verifyResult, 
                    {color: verifyResult ? '#4CAF50' : '#F44336'}
                  ]}
                >
                  验证结果: {verifyResult ? '匹配' : '不匹配'}
                </Text>
              )}
            </Card.Content>
          </Card>
          
          <Text style={styles.infoText}>
            此页面使用 SHA-512 算法对密码进行加密，采用用户名作为盐值。
            这种方法避免了明文密码传输，并确保相同密码对不同用户产生不同的哈希值。
            后端验证时使用相同的用户名作为盐值重新计算哈希进行比对。
          </Text>
                           
          <Card style={[styles.card, {marginTop: 20}]}>
            <Card.Title title="哈希算法对比" />
            <Card.Content>
              <ScrollView horizontal>
                <View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableHeader, {width: 120}]}>特性</Text>
                    <Text style={[styles.tableHeader, {width: 140}]}>随机盐值 SHA-512</Text>
                    <Text style={[styles.tableHeader, {width: 140}]}>Bcrypt</Text>
                    <Text style={[styles.tableHeader, {width: 140}]}>用户名盐值 SHA-512</Text>
                  </View>
                  
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, {width: 120}]}>安全性</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>高</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>最高</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>中等</Text>
                  </View>
                  
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, {width: 120}]}>计算速度</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>非常快</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>故意减慢</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>非常快</Text>
                  </View>
                  
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, {width: 120}]}>防暴力破解</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>需多次迭代</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>内置</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>需多次迭代</Text>
                  </View>
                  
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, {width: 120}]}>盐值可预测性</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>不可预测</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>不可预测</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>完全可预测</Text>
                  </View>
                  
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, {width: 120}]}>客户端计算</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>不适合</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>不适合</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>适合</Text>
                  </View>
                  
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, {width: 120}]}>哈希速度比较</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>~640,000,000次/秒</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>~550次/秒</Text>
                    <Text style={[styles.tableCell, {width: 140}]}>~640,000,000次/秒</Text>
                  </View>
                </View>
              </ScrollView>
              
              <View style={styles.securityNotice}>
                <Text style={styles.securityNoticeTitle}>为什么用户名作为盐值与安全最佳实践相违背？</Text>
                <View style={styles.securityItem}>
                  <Text style={styles.securityPoint}>• 盐值可预测：</Text>
                  <Text style={styles.securityText}>用户名通常是公开的或可猜测的，攻击者可以针对特定用户名提前构建彩虹表</Text>
                </View>
                <View style={styles.securityItem}>
                  <Text style={styles.securityPoint}>• 盐值长度不足：</Text>
                  <Text style={styles.securityText}>用户名通常较短，而安全的盐值应至少有16字节随机数据</Text>
                </View>
                <View style={styles.securityItem}>
                  <Text style={styles.securityPoint}>• 盐值不随机：</Text>
                  <Text style={styles.securityText}>密码学要求盐值应由加密安全的随机数生成器产生</Text>
                </View>
                <View style={styles.securityItem}>
                  <Text style={styles.securityPoint}>• 用户名更改问题：</Text>
                  <Text style={styles.securityText}>如用户修改用户名，所有密码哈希都需重新计算</Text>
                </View>
                <View style={styles.securityItem}>
                  <Text style={styles.securityPoint}>• 缺乏时间成本：</Text>
                  <Text style={styles.securityText}>现代密码哈希应包含可调整的工作因子以抵抗硬件加速攻击</Text>
                </View>
                <View style={styles.securityItem}>
                  <Text style={styles.securityPoint}>• 跨服务攻击风险：</Text>
                  <Text style={styles.securityText}>如果用户在多个服务使用相同用户名和密码，一处泄露会影响所有服务</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Sarasa',
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 16,
  },
  hashContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },
  hashResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  hashText: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  copyIcon: {
    marginLeft: 8,
  },
  divider: {
    marginVertical: 16,
  },
  verifyResult: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  infoText: {
    marginTop: 24,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableHeader: {
    fontWeight: 'bold',
    padding: 8,
    backgroundColor: '#f0f0f0',
    textAlign: 'center',
  },
  tableCell: {
    padding: 8,
    textAlign: 'center',
  },
  securityNotice: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FBC02D',
  },
  securityNoticeTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 10,
    color: '#F57F17',
  },
  securityItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  securityPoint: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#333',
    width: 110,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
}); 