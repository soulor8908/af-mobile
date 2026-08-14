import { AfNoticeBar as NoticeBar } from 'aiflow-ui/components/af-notice-bar.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfNoticeBar = createWrapper('af-notice-bar', NoticeBar, {
  props: ['text', 'scroll'],
});
