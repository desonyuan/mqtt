import {StyleSheet, View} from 'react-native';
import React, {FC, PropsWithChildren, ReactNode} from 'react';
import {useThemeColor} from '@/hooks/useThemeColor';
import {Card} from 'react-native-paper';

type Props = {
  footerComponent?: ReactNode;
  headerComponent?: ReactNode;
  cardTitle?: ReactNode;
};

const CardBox: FC<PropsWithChildren<Props>> = (props) => {
  const cardColor = useThemeColor({}, 'background');

  return (
    <View style={styles.container}>
      {props.headerComponent && props.headerComponent}
      <Card style={[styles.flex1, {backgroundColor: cardColor}]}>
        {props.cardTitle && props.cardTitle}
        <Card.Content style={styles.content}>{props.children}</Card.Content>
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
});
