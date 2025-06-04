import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import {api} from '@/services/api';
import {usePagination} from 'ahooks';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import {FC} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {DataTable} from 'react-native-paper';

// 插件激活
dayjs.extend(utc);
dayjs.extend(timezone);

type IProps = {deviceId: string; time: number};
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

const DeviceLog: FC<IProps> = ({deviceId, time}) => {
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

  console.log(data, '111111111');

  const searchHandle = (page = 1) => {
    run({current: page, pageSize});
  };

  return (
    <CardBox
      scrollable
      containerStyle={{paddingHorizontal: 10}}
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
          {/* <DataTable.Title>警报名称</DataTable.Title> */}
          <DataTable.Title>发生时间</DataTable.Title>
        </DataTable.Header>

        {data?.data.map((item: RowData, index: number) => {
          const json = JSON.parse(item.details);
          const date = item.timestamp ? dayjs(parseInt((json.timestamp + time) * 1000 + '')) : null;
          if (item.timestamp) {
            console.log(new Date(item.timestamp), item.timestamp);
          }

          console.log(json, '1111111111');

          return (
            <DataTable.Row key={index}>
              <DataTable.Cell>{json.device_uuid}</DataTable.Cell>
              <DataTable.Cell>{json.event_type}</DataTable.Cell>
              {/* <DataTable.Cell>{item.details}</DataTable.Cell> */}
              <DataTable.Cell>
                <View style={styles.dateContainer}>
                  {date && (
                    <>
                      <Text style={styles.dateOfYear}>
                        {date.get('year')}/{date.get('month') + 1}/{date.get('date')}
                      </Text>
                      <Text style={styles.dateOfMonth}>
                        {date.get('hour')}:{date.get('second')}:{date.get('minute')}
                      </Text>
                    </>
                  )}
                </View>
              </DataTable.Cell>
            </DataTable.Row>
          );
        })}
      </DataTable>
    </CardBox>
  );
};

export default DeviceLog;

const styles = StyleSheet.create({
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateOfYear: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  dateOfMonth: {
    // fontWeight: 'bold',
    fontSize: 11,
    color: '#333',
  },
});
