import { AfBacktop as Backtop } from 'aiflow-ui/components/af-backtop.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfBacktop = createWrapper('af-backtop', Backtop, {
  props: ['threshold', 'target', 'text', 'ariaLabelText', 'position'],
  events: ['af-backtop:click'],
});
