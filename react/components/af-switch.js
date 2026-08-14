import { AfSwitch as Switch } from '@af-mobile/ui/components/af-switch.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfSwitch = createWrapper('af-switch', Switch, {
  props: ['checked', 'disabled', 'loading', 'size'],
  events: ['af-switch:change'],
});
