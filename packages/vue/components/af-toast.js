import { AfToast as Toast } from '@af-mobile/ui/components/af-toast.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfToast = createWrapper('af-toast', Toast, {
  props: ['duration'],
  events: ['af-toast:dismiss'],
});
