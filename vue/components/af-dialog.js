import { AfDialog as Dialog } from 'aiflow-ui/components/af-dialog.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfDialog = createWrapper('af-dialog', Dialog, {
  props: ['title', 'closeOnEsc', 'closeOnBackdrop', 'variant'],
  events: ['af-dialog:open', 'af-dialog:close'],
});
