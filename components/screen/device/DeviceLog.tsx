import {staticAlertData, staticSensorData} from '@/utils/mockData';
import dayjs from 'dayjs';
import {useState} from 'react';
import {DataTable} from 'react-native-paper';

const DeviceLog = () => {
  const [items] = useState(staticAlertData);

  return (
    <DataTable>
      <DataTable.Header>
        <DataTable.Title>设备id</DataTable.Title>
        <DataTable.Title>类型</DataTable.Title>
        <DataTable.Title>警报名称</DataTable.Title>
        <DataTable.Title>发生时间</DataTable.Title>
      </DataTable.Header>

      {items.map((item, index) => (
        <DataTable.Row key={index}>
          <DataTable.Cell>{item.device_uuid}</DataTable.Cell>
          <DataTable.Cell>{item.alert_type}</DataTable.Cell>
          <DataTable.Cell>{item.alert_name}</DataTable.Cell>
          <DataTable.Cell>{dayjs(item.timestamp).format('YYYY-MM-DD HH:mm:ss')}</DataTable.Cell>
        </DataTable.Row>
      ))}

      {/* <DataTable.Pagination
          page={page}
          numberOfPages={Math.ceil(items.length / itemsPerPage)}
          onPageChange={(page) => setPage(page)}
          label={`${from + 1}-${to} of ${items.length}`}
          numberOfItemsPerPageList={numberOfItemsPerPageList}
          numberOfItemsPerPage={itemsPerPage}
          onItemsPerPageChange={onItemsPerPageChange}
          showFastPaginationControls
          selectPageDropdownLabel={'Rows per page'}
        /> */}
    </DataTable>
  );
};

export default DeviceLog;
