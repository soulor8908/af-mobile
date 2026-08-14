import { AfPullRefresh as PullRefresh } from '@af-mobile/ui/components/af-pull-refresh.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfPullRefresh = createWrapper('af-pull-refresh', PullRefresh, {
  props: ['refreshing'],
  events: ['af-pull-refresh:refresh'],
});
