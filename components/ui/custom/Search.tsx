import React, {FC} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {Searchbar, Text} from 'react-native-paper';

type Props = {
  onChangeText: (value: string) => void;
  value: string;
  onEndEditing?: Function;
  loading?: boolean;
  onPress?: () => void;
  placeholder?: string;
  buttonText?: string;
};

const Search: FC<Props> = ({onChangeText, onEndEditing, value, loading, onPress, buttonText = '搜索', placeholder}) => {
  return (
    <View>
      <Searchbar
        textAlignVertical="center"
        placeholder={placeholder ?? '请输入搜索内容'}
        onChangeText={onChangeText}
        value={value}
        style={styles.searchBar}
        onEndEditing={() => {
          onEndEditing?.();
        }}
        right={() => (
          <Pressable
            disabled={loading}
            style={styles.searchButton}
            onPress={() => {
              if (onPress) {
                onPress();
              } else {
                onEndEditing?.();
              }
            }}
          >
            {loading ? <ActivityIndicator /> : <Text style={styles.butText}>{buttonText}</Text>}
          </Pressable>
        )}
      />
    </View>
  );
};

export default Search;

const styles = StyleSheet.create({
  searchBar: {
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
    height: 60,
    alignItems: 'center',
  },
  searchButton: {
    width: 80,
    backgroundColor: '#4CAF50',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  butText: {
    color: 'white',
  },
});
