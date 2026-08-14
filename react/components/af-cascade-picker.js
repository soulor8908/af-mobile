import { AfCascadePicker as CascadePicker } from '@af-mobile/ui/components/af-cascade-picker.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfCascadePicker = createWrapper('af-cascade-picker', CascadePicker, {
  props: ['tree', 'values', 'title', 'confirmText', 'cancelText', 'itemHeight', 'visibleCount'],
  events: ['af-picker:change', 'af-picker:confirm', 'af-picker:cancel'],
});
