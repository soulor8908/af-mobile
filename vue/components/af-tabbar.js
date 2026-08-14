import { AfTabbar as Tabbar } from '@af-mobile/ui/components/af-tabbar.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfTabbar = createWrapper('af-tabbar', Tabbar, {
  props: ['tabs', 'activeIndex', 'fixed', 'ariaLabel'],
  events: ['af-tabbar:change'],
  model: { event: 'af-tabbar:change', key: 'index', target: 'activeIndex' },
});
