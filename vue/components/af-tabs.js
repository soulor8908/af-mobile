import { AfTabs as Tabs } from '@af-mobile/ui/components/af-tabs.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfTabs = createWrapper('af-tabs', Tabs, {
  props: ['tabs', 'activeIndex', 'variant', 'fixed'],
  events: ['af-tabs:change'],
  model: { event: 'af-tabs:change', key: 'index', target: 'activeIndex' },
});
