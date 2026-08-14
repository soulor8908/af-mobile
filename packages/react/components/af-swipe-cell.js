import { AfSwipeCell as SwipeCell } from '@af-mobile/ui/components/af-swipe-cell.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfSwipeCell = createWrapper('af-swipe-cell', SwipeCell, {
  events: ['af-swipe-cell:action', 'af-swipe-cell:change'],
});
