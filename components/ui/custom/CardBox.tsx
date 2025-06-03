import {StyleSheet, View} from 'react-native';
import React, {FC, PropsWithChildren, ReactNode} from 'react';
import {useThemeColor} from '@/hooks/useThemeColor';
import {ActivityIndicator, Card} from 'react-native-paper';

type Props = {
  footerComponent?: ReactNode;
  headerComponent?: ReactNode;
  cardTitle?: ReactNode;
  loading?: boolean;
};

const CardBox: FC<PropsWithChildren<Props>> = (props) => {
  const cardColor = useThemeColor({}, 'background');

  return (
    <View style={styles.container}>
      {props.headerComponent && props.headerComponent}
      <Card style={[styles.flex1, {backgroundColor: cardColor}]}>
        {props.cardTitle && props.cardTitle}
        <Card.Content style={styles.content}>
          {props.loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator />
            </View>
          ) : (
            props.children
          )}
        </Card.Content>
      </Card>
      {props.footerComponent && props.footerComponent}
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
