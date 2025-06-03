import {staticSensorData} from '@/utils/mockData';
import {useState} from 'react';
import {DataTable} from 'react-native-paper';

const DeviceTable = () => {
  const [items] = useState(staticSensorData);

  return (
    <DataTable>
      <DataTable.Header>
        <DataTable.Title>🌡️温度</DataTable.Title>
        <DataTable.Title>💧 湿度</DataTable.Title>
        <DataTable.Title>☀️ 光照</DataTable.Title>
        <DataTable.Title>🌱 土壤温度</DataTable.Title>
        <DataTable.Title>☁️ CO2</DataTable.Title>
        <DataTable.Title>⏱️ 时间</DataTable.Title>
      </DataTable.Header>

      {items.map((item, index) => (
        <DataTable.Row key={index}>
          <DataTable.Cell>{item.temperature}</DataTable.Cell>
          <DataTable.Cell>{item.humidity}</DataTable.Cell>
          <DataTable.Cell>{item.light}</DataTable.Cell>
          <DataTable.Cell>{item.soil_moisture}</DataTable.Cell>
          <DataTable.Cell>{item.co2}</DataTable.Cell>
          <DataTable.Cell>{`2025/03`}</DataTable.Cell>
        </DataTable.Row>
      ))}
    </DataTable>
  );
};

export default DeviceTable;
