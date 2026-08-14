import { AfList as List } from 'aiflow-ui/components/af-list.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfList = createWrapper('af-list', List, {
  props: ['data', 'pageSize', 'itemHeight', 'buffer', 'mode', 'refresh', 'loading', 'emptyText', 'height', 'totalCount'],
  events: ['af-list:loadmore', 'af-list:refresh', 'af-list:itemclick'],
});
