import { AfTabs as Tabs } from 'aiflow-ui/components/af-tabs.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfTabs = createWrapper('af-tabs', Tabs, {
  props: ['tabs', 'activeIndex', 'variant', 'fixed'],
  events: ['af-tabs:change'],
});
