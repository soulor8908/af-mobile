import { AfProgress as Progress } from 'aiflow-ui/components/af-progress.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfProgress = createWrapper('af-progress', Progress, {
  props: ['value', 'max', 'color'],
});