import { AfSteps as Steps } from '@af-mobile/ui/components/af-steps.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfSteps = createWrapper('af-steps', Steps, {
  props: ['steps', 'current'],
});