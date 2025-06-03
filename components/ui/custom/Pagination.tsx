import {StyleSheet, TextInput, View} from 'react-native';
import React, {FC, PropsWithChildren} from 'react';
import {DataTable} from 'react-native-paper';

type Props = {
  page: number;
  total?: number;
  onPageChange: (page: number) => void;
  label?: string;
  numberOfItemsPerPageList?: number;
  onSubmitEditing?: (page: number) => void;
};

const Pagination: FC<PropsWithChildren<Props>> = ({
  page = 1,
  total = 1,
  onPageChange,
  label,
  numberOfItemsPerPageList,
  onSubmitEditing,
}) => {
  return (
    <View style={styles.pagination}>
      <DataTable.Pagination
        page={page}
        numberOfPages={total}
        onPageChange={onPageChange!}
        label={label}
        // showFastPaginationControls
        numberOfItemsPerPageList={numberOfItemsPerPageList ? [numberOfItemsPerPageList] : []}
        // numberOfItemsPerPage={numberOfItemsPerPage}
        // onItemsPerPageChange={onItemsPerPageChange}
        // selectPageDropdownLabel={'Rows per page'}
      />
      <View style={styles.paginationJumpBox}>
        <TextInput
          returnKeyLabel="跳转"
          placeholder="跳转"
          onSubmitEditing={(e) => {
            if (onSubmitEditing) {
              let n = parseInt(e.nativeEvent.text);
              if (isNaN(n)) {
                n = 1;
              }
              if (n > total) {
                n = total;
              }
              if (n <= 0) {
                n = 1;
              }
              onSubmitEditing(n);
            }
          }}
          style={styles.jumpInput}
          keyboardType="number-pad"
        />
      </View>
    </View>
  );
};

export default Pagination;

const styles = StyleSheet.create({
  pagination: {
    alignItems: 'center',
    justifyContent: 'space-around',
    flexDirection: 'row',
  },
  paginationJumpBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  jumpInput: {
    width: 48,
    height: 30,
    borderRadius: 5,
    // backgroundColor: 'rgb(199, 199, 199)',
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
