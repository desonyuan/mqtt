//本地化dayjs
import dayjs from 'dayjs';
import zh_CN from 'dayjs/locale/zh-cn';
dayjs.locale(zh_CN);

export const $dayjs = dayjs;
