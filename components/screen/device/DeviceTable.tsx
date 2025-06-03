import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import {api} from '@/services/api';
import {usePagination} from 'ahooks';
import {FC} from 'react';
import {StyleSheet} from 'react-native';
import {DataTable} from 'react-native-paper';

type IProps = {deviceId: string};
const pageSize = 20;
interface RowData {
  co2: number;
  device_uuid: string;
  humidity: number;
  light: number;
  soil_moisture: number;
  temperature: number;
  timestamp: number;
}
const DeviceTable: FC<IProps> = ({deviceId}) => {
  const {data, run, loading} = usePagination(
    async (params) => {
      const res = await api.get('/device-sensor-data', {
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
  const searchHandle = (page = 1) => {
    run({current: page, pageSize});
  };
  return (
    <CardBox
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
      <DataTable style={styles.p0}>
        <DataTable.Header style={styles.p0}>
          <DataTable.Title>🌡️温度</DataTable.Title>
          <DataTable.Title>💧 湿度</DataTable.Title>
          <DataTable.Title>☀️ 光照</DataTable.Title>
          <DataTable.Title>🌱 土壤温度</DataTable.Title>
          <DataTable.Title>☁️ CO2</DataTable.Title>
          <DataTable.Title>⏱️ 时间</DataTable.Title>
        </DataTable.Header>

        {data?.raw_data.map((item: RowData, index: number) => (
          <DataTable.Row key={index}>
            <DataTable.Cell>{item.temperature.toFixed(1)}</DataTable.Cell>
            <DataTable.Cell>{item.humidity.toFixed(1)}</DataTable.Cell>
            <DataTable.Cell>{item.light.toFixed(1)}</DataTable.Cell>
            <DataTable.Cell>{item.soil_moisture.toFixed(1)}</DataTable.Cell>
            <DataTable.Cell>{item.co2.toFixed(1)}</DataTable.Cell>
            <DataTable.Cell>{item.timestamp}</DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable>
    </CardBox>
  );
};

export default DeviceTable;

const styles = StyleSheet.create({
  p0: {
    padding: 0,
  },
});
