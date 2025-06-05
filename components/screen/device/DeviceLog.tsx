import CardBox from '@/components/ui/custom/CardBox';
import Pagination from '@/components/ui/custom/Pagination';
import {api} from '@/services/api';
import {usePagination} from 'ahooks';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import {FC, useEffect, useState} from 'react';
import {StyleSheet, Text, View, ScrollView} from 'react-native';
import {useThemeColor} from '@/hooks/useThemeColor';
import {Table, Row, TableWrapper, Cell} from 'react-native-reanimated-table';

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

// 根据类型返回对应的事件名称
const getEventTypeName = (type: number | string): string => {
  console.log(type, ' type');
  // 确保类型转换为数字进行比较
  const typeNum = Number(type);
  switch (typeNum) {
    case 1:
      return '入侵';
    case 2: 
      return '火灾';
    case 3: 
      return '日志';
    default:
      return String(type);
  }
};

const DeviceLog: FC<IProps> = ({deviceId, time}) => {
  const [tableData, setTableData] = useState<any[][]>([]);
  const [tableHead] = useState(['类型', '事件详情', '发生时间']);
  const [widthArr] = useState([100, 150, 150]);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

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

  // 格式化数据为表格所需格式
  useEffect(() => {
    if (data?.data) {
      const formattedData = data.data.map((item: RowData) => {
        const json = JSON.parse(item.details);
        const date = item.timestamp ? dayjs(parseInt((json.timestamp + time) * 1000 + '')) : null;
        
        // 格式化时间显示
        const formattedDate = date ? 
          `${date.get('year')}/${date.get('month') + 1}/${date.get('date')} ${date.get('hour')}:${date.get('minute')}:${date.get('second')}` : 
          '时间未知';
        
        return [
          getEventTypeName(json.event_type),
          json.event_message || '无详细信息',
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
      scrollable
      containerStyle={{paddingHorizontal: 0}}
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
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
          <View style={styles.tableContainer}>
            <Table borderStyle={styles.tableBorder}>
              <Row 
                data={tableHead} 
                widthArr={widthArr} 
                style={styles.header} 
                textStyle={styles.headerText}
              />
              {
                tableData.map((rowData, index) => (
                  <TableWrapper key={index} style={[
                    styles.rowWrapper,
                    index % 2 === 0 ? styles.evenRow : styles.oddRow
                  ]}>
                    {
                      rowData.map((cellData, cellIndex) => (
                        <Cell
                          key={cellIndex}
                          data={cellData}
                          width={widthArr[cellIndex]}
                          textStyle={[styles.cellText, {color: textColor}]}
                        />
                      ))
                    }
                  </TableWrapper>
                ))
              }
            </Table>
          </View>
        </ScrollView>
      </View>
    </CardBox>
  );
};

export default DeviceLog;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableBorder: {
    borderWidth: 0, // 移除单元格边框
  },
  header: {
    height: 50,
    backgroundColor: '#4A6FA5', // 更柔和的蓝色
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Sarasa',
    color: '#FFFFFF',
  },
  rowWrapper: {
    flexDirection: 'row',
    height: 50,
  },
  evenRow: {
    backgroundColor: '#F8F9FA', // 浅灰色背景
  },
  oddRow: {
    backgroundColor: '#FFFFFF', // 白色背景
  },
  cellText: {
    textAlign: 'center',
    fontWeight: '400',
    padding: 8,
    fontFamily: 'Sarasa',
    fontSize: 14,
  },
  dataWrapper: {
    maxHeight: 500,
  },
});
