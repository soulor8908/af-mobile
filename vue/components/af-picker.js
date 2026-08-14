import { AfPicker as Picker } from '@af-mobile/ui/components/af-picker.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfPicker = createWrapper('af-picker', Picker, {
  props: ['columns', 'values', 'title', 'confirmText', 'cancelText', 'itemHeight', 'visibleCount'],
  events: ['af-picker:change', 'af-picker:confirm', 'af-picker:cancel'],
  model: { event: 'af-picker:confirm', key: 'values', target: 'values' },
});
