import { AfActionSheet as ActionSheet } from '@af-mobile/ui/components/af-action-sheet.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfActionSheet = createWrapper('af-action-sheet', ActionSheet, {
  props: ['options', 'title', 'showCancel', 'cancelText'],
  events: ['af-action-sheet:select', 'af-action-sheet:close', 'af-action-sheet:open'],
});
