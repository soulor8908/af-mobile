import { AfTabbar as Tabbar } from 'aiflow-ui/components/af-tabbar.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfTabbar = createWrapper('af-tabbar', Tabbar, {
  props: ['tabs', 'activeIndex', 'fixed', 'ariaLabel'],
  events: ['af-tabbar:change'],
});
