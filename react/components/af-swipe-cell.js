import { AfSwipeCell as SwipeCell } from 'aiflow-ui/components/af-swipe-cell.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfSwipeCell = createWrapper('af-swipe-cell', SwipeCell, {
  props: ['disabled'],
  events: ['af-swipe-cell:action'],
});
