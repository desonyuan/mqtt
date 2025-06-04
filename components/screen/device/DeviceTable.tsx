import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import {api} from '@/services/api';
import {usePagination} from 'ahooks';
import dayjs from 'dayjs';
import {FC} from 'react';
import {StyleSheet, View} from 'react-native';
import {DataTable, Text} from 'react-native-paper';

type IProps = {deviceId: string; time: number};
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
const DeviceTable: FC<IProps> = ({deviceId, time}) => {
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
      containerStyle={{paddingHorizontal: 10}}
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
      <DataTable style={styles.p0}>
        <DataTable.Header style={styles.p0}>
          <DataTable.Title>🌡️温度</DataTable.Title>
          <DataTable.Title>💧 湿度</DataTable.Title>
          <DataTable.Title>☀️ 光照</DataTable.Title>
          <DataTable.Title>🌱 土壤温度</DataTable.Title>
          <DataTable.Title>☁️ CO2</DataTable.Title>
          <DataTable.Title numeric>⏱️ 时间</DataTable.Title>
        </DataTable.Header>

        {data?.raw_data.map((item: RowData, index: number) => {
          console.log(item, '111111111111');

          const temperature = Number(item.temperature.toFixed(1));
          const humidity = Number(item.humidity.toFixed(1));
          const light = Number(item.light.toFixed(1));
          const soil_moisture = Number(item.soil_moisture.toFixed(1));
          const co2 = Number(item.co2.toFixed(1));
          const date = item.timestamp ? dayjs(parseInt((item.timestamp + time) * 1000 + '')) : null;

          return (
            <DataTable.Row key={index}>
              <DataTable.Cell>{temperature <= -999 ? 'null' : temperature}</DataTable.Cell>
              <DataTable.Cell>{humidity <= -999 ? 'null' : humidity}</DataTable.Cell>
              <DataTable.Cell>{light <= -999 ? 'null' : light}</DataTable.Cell>
              <DataTable.Cell>{soil_moisture <= -999 ? 'null' : soil_moisture}</DataTable.Cell>
              <DataTable.Cell>{co2 <= -999 ? 'null' : co2}</DataTable.Cell>
              <DataTable.Cell numeric>
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

export default DeviceTable;

const styles = StyleSheet.create({
  p0: {
    padding: 0,
  },
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
