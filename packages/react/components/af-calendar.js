import { AfCalendar as Calendar } from '@af-mobile/ui/components/af-calendar.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfCalendar = createWrapper('af-calendar', Calendar, {
  props: ['value', 'month', 'min', 'max'],
  events: ['af-calendar:select', 'af-calendar:monthchange'],
});
