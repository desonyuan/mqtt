import {StyleSheet, View} from 'react-native';
import React, {FC, PropsWithChildren, ReactNode} from 'react';
import {useThemeColor} from '@/hooks/useThemeColor';
import {ActivityIndicator, Card} from 'react-native-paper';
import {ScrollView} from 'react-native-gesture-handler';

type Props = {
  footerComponent?: ReactNode;
  headerComponent?: ReactNode;
  cardTitle?: ReactNode;
  loading?: boolean;
  scrollable?: boolean;
};

const CardBox: FC<PropsWithChildren<Props>> = ({
  headerComponent,
  cardTitle,
  children,
  scrollable = false,
  loading,
  footerComponent,
}) => {
  const cardColor = useThemeColor({}, 'background');

  return (
    <View style={styles.container}>
      {headerComponent && headerComponent}
      <Card style={[styles.flex1, {backgroundColor: cardColor}]}>
        {cardTitle && cardTitle}
        <Card.Content style={styles.content}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator />
            </View>
          ) : scrollable ? (
            <ScrollView>{children}</ScrollView>
          ) : (
            children
          )}
        </Card.Content>
      </Card>
      {footerComponent && footerComponent}
    </View>
  );
};

export default CardBox;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  content: {
    height: '100%',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
