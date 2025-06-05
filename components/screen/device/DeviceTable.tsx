import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import {api} from '@/services/api';
import {useThemeColor} from '@/hooks/useThemeColor';
import {usePagination} from 'ahooks';
import dayjs from 'dayjs';
import {FC, useEffect, useState} from 'react';
import {StyleSheet, View, ScrollView, Text} from 'react-native';
import {Table, Row, TableWrapper} from 'react-native-reanimated-table';

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
  // 表格状态
  const [tableData, setTableData] = useState<any[][]>([]);
  const [tableHead] = useState(['🌡️ 温度', '💧 湿度', '☀️ 光照', '🌱 土壤湿度', '☁️ CO2', '⏱️ 时间']);
  const [widthArr] = useState([100, 100, 100, 120, 100, 180]);
  
  // 主题颜色
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const themeColor = useThemeColor({}, 'tint');
  
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
  
  // 格式化数据为表格所需格式
  useEffect(() => {
    if (data?.raw_data) {
      const formattedData = data.raw_data.map((item: RowData) => {
        // 处理值，小于等于-999的显示为0
        const normalizeValue = (value: number) => value <= -999 ? '0' : value.toFixed(1);
        
        // 格式化日期
        const date = item.timestamp ? dayjs(parseInt((item.timestamp + time) * 1000 + '')) : null;
        const formattedDate = date ? 
          `${date.get('year')}/${date.get('month') + 1}/${date.get('date')} ${date.get('hour')}:${date.get('minute')}:${date.get('second')}` : 
          '时间未知';
          
        // 返回行数据
        return [
          normalizeValue(item.temperature),
          normalizeValue(item.humidity),
          normalizeValue(item.light),
          normalizeValue(item.soil_moisture),
          normalizeValue(item.co2),
          formattedDate
        ];
      });
      
      setTableData(formattedData);
    }
  }, [data, time]);
  
  const searchHandle = (page = 1) => {
    run({current: page, pageSize});
  };
  
  return (
    <CardBox
      containerStyle={{paddingHorizontal: 0}}
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
      <View style={[styles.container, {backgroundColor}]}>
        <ScrollView horizontal={true}>
          <View>
            <Table borderStyle={{borderWidth: 1, borderColor: '#C1C0B9'}}>
              <Row 
                data={tableHead} 
                widthArr={widthArr} 
                style={styles.header}
                textStyle={{...styles.headerText, color: '#FFFFFF'}}
              />
            </Table>
            <ScrollView style={styles.dataWrapper}>
              <Table borderStyle={{borderWidth: 1, borderColor: '#C1C0B9'}}>
                {
                  tableData.map((rowData, index) => (
                    <Row
                      key={index}
                      data={rowData}
                      widthArr={widthArr}
                      style={[
                        styles.row,
                        index % 2 === 1 ? {backgroundColor: 'rgba(247, 246, 231, 0.8)'} : null
                      ]}
                      textStyle={{...styles.text, color: textColor}}
                    />
                  ))
                }
              </Table>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </CardBox>
  );
};

export default DeviceTable;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
  },
  header: {
    height: 50,
    backgroundColor: '#537791',
  },
  headerText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Sarasa',
  },
  text: {
    textAlign: 'center',
    fontWeight: '400',
    padding: 6,
    fontFamily: 'Sarasa',
  },
  dataWrapper: {
    marginTop: -1,
    maxHeight: 500,
  },
  row: {
    height: 50,
    backgroundColor: 'rgba(231, 230, 225, 0.8)',
  }
});
