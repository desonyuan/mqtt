import {api} from '@/services/api';
import {useRequest} from 'ahooks';
import {router} from 'expo-router';
import {FC, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import Toast from 'react-native-toast-message';

interface IProps {}

const CreateArticle: FC = () => {
  const [title, setTile] = useState('');
  const [content, setContent] = useState('');
  const {run, loading} = useRequest(
    () => {
      return api.post('/admin/articles', {
        title,
        content,
      });
    },
    {
      manual: true,
      onSuccess(data) {
        if (data.status === 200) {
          Toast.show({
            type: 'success',
            text1: '发布成功',
            text2: '您的文章已发表成功',
          });
          router.back();
        }
      },
    }
  );
  const publish = () => {
    if (!title) {
      Toast.show({type: 'error', text1: '错误', text2: '标题不能为空'});
      return;
    }
    if (!content || content.length < 10) {
      Toast.show({type: 'error', text1: '错误', text2: '文章内容不能小于10个字符'});
      return;
    }
    run();
  };
  return (
    <View style={styles.container}>
      <TextInput
        // label="文章标题"
        placeholder="文章标题"
        value={title}
        onChangeText={(text) => {
          setTile(text.trim());
        }}
      />
      <TextInput
        multiline
        style={styles.contentIpt}
        value={content}
        onChangeText={setContent}
        verticalAlign="top"
      ></TextInput>
      <Button onPress={publish} loading={loading} mode="contained">
        发表
      </Button>
    </View>
  );
};

export default CreateArticle;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    gap: 20,
  },
  contentIpt: {
    flex: 1,
  },
});
