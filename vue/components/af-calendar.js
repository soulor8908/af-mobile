import { AfCalendar as Calendar } from 'aiflow-ui/components/af-calendar.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfCalendar = createWrapper('af-calendar', Calendar, {
  props: ['value', 'month', 'min', 'max'],
  events: ['af-calendar:select', 'af-calendar:monthchange'],
  model: { event: 'af-calendar:select', key: 'date', target: 'value' },
});
