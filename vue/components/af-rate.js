import { AfRate as Rate } from '@af-mobile/ui/components/af-rate.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfRate = createWrapper('af-rate', Rate, {
  props: ['value', 'max', 'readonly', 'size', 'label'],
  events: ['af-rate:change'],
  model: { event: 'af-rate:change', key: 'value', target: 'value' },
});
