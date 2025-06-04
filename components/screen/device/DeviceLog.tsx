import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import {api} from '@/services/api';
import {staticAlertData, staticSensorData} from '@/utils/mockData';
import {usePagination} from 'ahooks';
import dayjs from 'dayjs';
import {FC, useState} from 'react';
import {DataTable} from 'react-native-paper';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// 插件激活
dayjs.extend(utc);
dayjs.extend(timezone);

type IProps = {deviceId: string};
interface RowData {
  details: string;
  device_uuid: string;
  event_type: string;
  log_uuid: string;
  timestamp: string;
  user_uuid: null | string;
}
const pageSize = 20;

const format = (str: string) => {
  const date = new Date(str);
  const dataStr = date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
  return dataStr;
};

const DeviceLog: FC<IProps> = ({deviceId}) => {
  const [items] = useState(staticAlertData);

  const {data, run, loading} = usePagination(
    async (params) => {
      const res = await api.get('/device-event-logs', {
        params: Object.assign({
          page: params.current,
          page_size: params.pageSize,
          device_uuid: deviceId,
        }),
      });
      return res.data;
    },
    {
      defaultParams: [{current: 1, pageSize}],
    }
  );
  console.log(data, '111111111111');

  const searchHandle = (page = 1) => {
    run({current: page, pageSize});
  };

  return (
    <CardBox
      scrollable
      loading={loading}
      footerComponent={
        <Pagination
          page={data?.current_page - 1}
          onPageChange={searchHandle}
          total={data?.total_pages}
          label={`第${data?.current_page}页，共${data?.total_pages}页`}
          numberOfItemsPerPageList={data?.total_items}
          onSubmitEditing={searchHandle}
        />
      }
    >
      <DataTable>
        <DataTable.Header>
          <DataTable.Title>设备id</DataTable.Title>
          <DataTable.Title>类型</DataTable.Title>
          <DataTable.Title>警报名称</DataTable.Title>
          <DataTable.Title>发生时间</DataTable.Title>
        </DataTable.Header>

        {data?.data.map((item: RowData, index: number) => (
          <DataTable.Row key={index}>
            <DataTable.Cell>{item.device_uuid}</DataTable.Cell>
            <DataTable.Cell>{item.event_type}</DataTable.Cell>
            <DataTable.Cell>{item.details}</DataTable.Cell>
            <DataTable.Cell>{format(item.timestamp)}</DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable>
    </CardBox>
  );
};

export default DeviceLog;
