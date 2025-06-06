// @generated by protoc-gen-es v2.5.1 with parameter "target=ts"
// @generated from file proto/config_payload.proto (package proto.config_payload, syntax proto3)
/* eslint-disable */

import type { GenFile, GenMessage } from "@bufbuild/protobuf/dist/cjs/codegenv2";
import { fileDesc, messageDesc } from "@bufbuild/protobuf/dist/cjs/codegenv2";
import type { Message } from "@bufbuild/protobuf";

/**
 * Describes the file proto/config_payload.proto.
 */
export const file_proto_config_payload: GenFile = /*@__PURE__*/
  fileDesc("Chpwcm90by9jb25maWdfcGF5bG9hZC5wcm90bxIUcHJvdG8uY29uZmlnX3BheWxvYWQigwIKD1RocmVzaG9sZENvbmZpZxIcCg91cHBlcl90aHJlc2hvbGQYASABKAJIAIgBARIcCg9sb3dlcl90aHJlc2hvbGQYAiABKAJIAYgBARIaCg11cHBlcl9lbmFibGVkGAMgASgISAKIAQESGgoNbG93ZXJfZW5hYmxlZBgEIAEoCEgDiAEBEhwKD2RhdGFfdmFsdWVfdHlwZRgFIAEoDUgEiAEBQhIKEF91cHBlcl90aHJlc2hvbGRCEgoQX2xvd2VyX3RocmVzaG9sZEIQCg5fdXBwZXJfZW5hYmxlZEIQCg5fbG93ZXJfZW5hYmxlZEISChBfZGF0YV92YWx1ZV90eXBlIq8ECg1Db25maWdQYXlsb2FkEhgKC2RldmljZV91dWlkGAEgASgJSACIAQESFgoJd2lmaV9zc2lkGAIgASgJSAGIAQESGgoNd2lmaV9wYXNzd29yZBgDIAEoCUgCiAEBEhgKC2RldmljZV9tb2RlGAQgASgNSAOIAQESEwoLc2xhdmVfdXVpZHMYBSADKAkSGAoLbWFzdGVyX3V1aWQYBiABKAlIBIgBARJHCgp0aHJlc2hvbGRzGAcgAygLMjMucHJvdG8uY29uZmlnX3BheWxvYWQuQ29uZmlnUGF5bG9hZC5UaHJlc2hvbGRzRW50cnkSHwoScGlyX3NlbnNvcl9lbmFibGVkGAggASgISAWIAQESHQoQbGlnaHRfcHdtX3RhcmdldBgJIAEoAkgGiAEBEhgKC3B3bV9lbmFibGVkGAogASgISAeIAQEaWAoPVGhyZXNob2xkc0VudHJ5EgsKA2tleRgBIAEoDRI0CgV2YWx1ZRgCIAEoCzIlLnByb3RvLmNvbmZpZ19wYXlsb2FkLlRocmVzaG9sZENvbmZpZzoCOAFCDgoMX2RldmljZV91dWlkQgwKCl93aWZpX3NzaWRCEAoOX3dpZmlfcGFzc3dvcmRCDgoMX2RldmljZV9tb2RlQg4KDF9tYXN0ZXJfdXVpZEIVChNfcGlyX3NlbnNvcl9lbmFibGVkQhMKEV9saWdodF9wd21fdGFyZ2V0Qg4KDF9wd21fZW5hYmxlZGIGcHJvdG8z");

/**
 * 阈值数据结构
 *
 * @generated from message proto.config_payload.ThresholdConfig
 */
export type ThresholdConfig = Message<"proto.config_payload.ThresholdConfig"> & {
  /**
   * @generated from field: optional float upper_threshold = 1;
   */
  upperThreshold?: number;

  /**
   * @generated from field: optional float lower_threshold = 2;
   */
  lowerThreshold?: number;

  /**
   * @generated from field: optional bool upper_enabled = 3;
   */
  upperEnabled?: boolean;

  /**
   * @generated from field: optional bool lower_enabled = 4;
   */
  lowerEnabled?: boolean;

  /**
   * @generated from field: optional uint32 data_value_type = 5;
   */
  dataValueType?: number;
};

/**
 * Describes the message proto.config_payload.ThresholdConfig.
 * Use `create(ThresholdConfigSchema)` to create a new message.
 */
export const ThresholdConfigSchema: GenMessage<ThresholdConfig> = /*@__PURE__*/
  messageDesc(file_proto_config_payload, 0);

/**
 * 可选的配置更新消息
 *
 * @generated from message proto.config_payload.ConfigPayload
 */
export type ConfigPayload = Message<"proto.config_payload.ConfigPayload"> & {
  /**
   * @generated from field: optional string device_uuid = 1;
   */
  deviceUuid?: string;

  /**
   * 基础字段
   *
   * @generated from field: optional string wifi_ssid = 2;
   */
  wifiSsid?: string;

  /**
   * @generated from field: optional string wifi_password = 3;
   */
  wifiPassword?: string;

  /**
   * @generated from field: optional uint32 device_mode = 4;
   */
  deviceMode?: number;

  /**
   * 从设备列表
   *
   * @generated from field: repeated string slave_uuids = 5;
   */
  slaveUuids: string[];

  /**
   * 主设备UUID(仅从设备模式下使用)
   *
   * @generated from field: optional string master_uuid = 6;
   */
  masterUuid?: string;

  /**
   * 传感器阈值
   *
   * @generated from field: map<uint32, proto.config_payload.ThresholdConfig> thresholds = 7;
   */
  thresholds: { [key: number]: ThresholdConfig };

  /**
   * 功能开关
   *
   * @generated from field: optional bool pir_sensor_enabled = 8;
   */
  pirSensorEnabled?: boolean;

  /**
   * @generated from field: optional float light_pwm_target = 9;
   */
  lightPwmTarget?: number;

  /**
   * @generated from field: optional bool pwm_enabled = 10;
   */
  pwmEnabled?: boolean;
};

/**
 * Describes the message proto.config_payload.ConfigPayload.
 * Use `create(ConfigPayloadSchema)` to create a new message.
 */
export const ConfigPayloadSchema: GenMessage<ConfigPayload> = /*@__PURE__*/
  messageDesc(file_proto_config_payload, 1);

