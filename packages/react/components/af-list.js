import { AfList as List } from '@af-mobile/ui/components/af-list.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfList = createWrapper('af-list', List, {
  props: ['data', 'pageSize', 'itemHeight', 'buffer', 'mode', 'refresh', 'loading', 'emptyText', 'height', 'totalCount', 'renderItem'],
  events: ['af-list:loadmore', 'af-list:refresh', 'af-list:itemclick'],
});
