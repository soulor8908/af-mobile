import { AfPullRefresh as PullRefresh } from 'aiflow-ui/components/af-pull-refresh.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfPullRefresh = createWrapper('af-pull-refresh', PullRefresh, {
  props: ['refreshing'],
  events: ['af-pull-refresh:refresh'],
});
