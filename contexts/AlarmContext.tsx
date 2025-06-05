import {StyleSheet, View} from 'react-native';
import React, {createContext, FC, PropsWithChildren, useContext, useEffect} from 'react';
import {useBoolean, useSetState} from 'ahooks';
import {Button, Modal, Text} from 'react-native-paper';
import {LinearGradient} from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {useAudioPlayer} from 'expo-audio';

const audioSource = require('../assets/alarm.mp3');

type EventOptions = {
  device_name: string;
  device_uuid: string;
  event_message: string;
  date: string;
};
interface AuthContextType {
  open: (options: EventOptions) => void;
  close: () => void;
}

// 创建上下文
const AlarmCtx = createContext<AuthContextType | undefined>(undefined);

type Props = {};
const genDefaultOption = (): EventOptions => {
  return {
    device_name: '',
    device_uuid: '',
    event_message: '',
    date: '',
  };
};
const AlarmContext: FC<PropsWithChildren<Props>> = ({children}) => {
  const [visible, setVisible] = useBoolean(false);
  const [state, setState] = useSetState<EventOptions>(genDefaultOption());
  const player = useAudioPlayer(audioSource);

  const openModal = (options: EventOptions) => {
    setState(options);
    setVisible.setTrue();
  };
  const closeModal = () => {
    setState(genDefaultOption());
    setVisible.setFalse();
  };
  useEffect(() => {
    if (visible) {
      player.seekTo(0);
    } else {
      player.pause();
    }
  }, [visible]);
  return (
    <AlarmCtx.Provider value={{open: openModal, close: closeModal}}>
      {children}
      <Modal visible={visible} onDismiss={setVisible.setFalse}>
        <View style={styles.container}>
          <View style={styles.innerBox}>
            <LinearGradient
              start={{x: 0, y: 0}}
              end={{x: 0, y: 1}}
              // locations={[0, 0]}
              // Button Linear Gradient
              colors={['yellow', 'white']}
              style={styles.linearGradient}
            >
              <View>
                {/* <Text style={styles.title}>警报</Text> */}
                <MaterialCommunityIcons name="alarm-light" size={44} color="red" />
              </View>
            </LinearGradient>
            <View style={styles.content}>
              <View style={styles.itemBox}>
                <Text style={styles.label}>警报设备：</Text>
                <Text style={styles.text}>{state.device_name}</Text>
              </View>
              <View style={styles.itemBox}>
                <Text style={styles.label}>设备Id：</Text>
                <Text style={styles.text}>{state.device_uuid}</Text>
              </View>
              <View style={styles.itemBox}>
                <Text style={styles.label}>通知消息：</Text>
                <Text style={styles.text}>{state.event_message}</Text>
              </View>
              <View style={styles.itemBox}>
                <Text style={styles.label}>发生时间：</Text>
                <Text style={styles.text}>{state.date}</Text>
              </View>
            </View>
            <View style={styles.button}>
              <Button mode="contained" onPress={closeModal}>
                知道了
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </AlarmCtx.Provider>
  );
};

export default AlarmContext;

export const useAlarm = () => {
  const context = useContext(AlarmCtx);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  innerBox: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    // minHeight: 200,
    overflow: 'hidden',
  },
  linearGradient: {
    position: 'absolute',
    height: 95,
    top: 0,
    right: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 25,
    color: 'white',
  },
  content: {
    paddingTop: 100,
    gap: 10,
  },
  button: {
    padding: 15,
    // alignItems: 'center',
    // borderRadius: 5,
  },
  text: {
    fontSize: 16,
  },
  itemBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: 'bold',
  },
});
