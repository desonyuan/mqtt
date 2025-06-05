import React, {useState, useRef, useEffect} from 'react';
import {StyleSheet, Dimensions, View, Image, FlatList, SafeAreaView, ActivityIndicator} from 'react-native';
import {Text, Button, useTheme} from 'react-native-paper';
import {ThemedView} from '@/components/ThemedView';
import {router} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {useAuth} from '@/contexts/AuthContext';
import {useAlarm} from '@/contexts/AlarmContext';

const {width} = Dimensions.get('window');

interface SlideItem {
  id: string;
  title: string;
  description: string;
  image: any;
}

const slides: SlideItem[] = [
  {
    id: '1',
    title: '智慧农业监测',
    description: '实时监测农田环境数据，掌握作物生长状况',
    image: require('@/assets/images/react-logo.png'),
  },
  {
    id: '2',
    title: '精准灌溉控制',
    description: '自动化灌溉系统，根据土壤湿度精准控制用水',
    image: require('@/assets/images/react-logo.png'),
  },
  {
    id: '3',
    title: '数据分析预测',
    description: '基于历史数据分析，预测产量和病虫害风险',
    image: require('@/assets/images/react-logo.png'),
  },
];

function LoadingScreen() {
  return (
    <ThemedView style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2E7D32" />
      <Text style={{marginTop: 20, fontFamily: 'Sarasa'}}>正在加载...</Text>
    </ThemedView>
  );
}

// 欢迎幻灯片组件接口
interface WelcomeSlidesProps {
  onFinish: () => void;
  onSkip: () => void;
}

// 欢迎幻灯片组件
function WelcomeSlides({onFinish, onSkip}: WelcomeSlidesProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef<FlatList<SlideItem>>(null);
  const theme = useTheme();

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(({viewableItems}: {viewableItems: any[]}) => {
    if (viewableItems.length > 0) {
      setCurrentSlideIndex(viewableItems[0].index);
    }
  }).current;

  const goToNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentSlideIndex + 1,
        animated: true,
      });
    } else {
      onFinish();
    }
  };

  const renderSlide = ({item}: {item: SlideItem}) => {
    return (
      <View style={styles.slideContainer}>
        <Image source={item.image} style={styles.image} resizeMode="contain" />
        <Text variant="headlineMedium" style={[styles.title, {fontFamily: 'Sarasa'}]}>
          {item.title}
        </Text>
        <Text variant="bodyLarge" style={[styles.description, {fontFamily: 'Sarasa'}]}>
          {item.description}
        </Text>
      </View>
    );
  };

  // 渲染底部导航点
  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index === currentSlideIndex ? theme.colors.primary : theme.colors.surfaceVariant,
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.skipContainer}>
          <Button mode="text" onPress={onSkip} labelStyle={[styles.fontSarasa]}>
            跳过
          </Button>
        </View>

        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        {renderDots()}

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={goToNextSlide}
            style={styles.button}
            labelStyle={[styles.buttonLabel, styles.fontSarasa]}
            buttonColor={theme.colors.primary}
          >
            {currentSlideIndex === slides.length - 1 ? '开始使用' : '下一步'}
          </Button>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

// 主组件
export default function Welcome() {
  const {isLoggedIn, isLoading, firstTimeUser, markAsReturningUser} = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn) {
        router.replace('/home');
      } else if (!firstTimeUser) {
        router.replace('/(auth)');
      }
    }
  }, [isLoading, isLoggedIn, firstTimeUser]);

  const handleFinishWelcome = () => {
    markAsReturningUser();
    router.replace('/(auth)');
  };

  // const handleSkipWelcome = () => {
  //   markAsReturningUser();
  //   router.replace('/login');
  // };

  if (isLoading || (!isLoading && (isLoggedIn || !firstTimeUser))) {
    return <LoadingScreen />;
  }

  return <WelcomeSlides onFinish={handleFinishWelcome} onSkip={handleFinishWelcome} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
  },
  skipContainer: {
    alignItems: 'flex-end',
    padding: 16,
  },
  slideContainer: {
    width,
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: width * 0.8,
    height: width * 0.8,
    marginBottom: 30,
  },
  title: {
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Sarasa',
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: 20,
    opacity: 0.8,
    fontFamily: 'Sarasa',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  button: {
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fontSarasa: {
    fontFamily: 'Sarasa',
  },
});
