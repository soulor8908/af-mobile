import { AfSteps as Steps } from 'aiflow-ui/components/af-steps.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfSteps = createWrapper('af-steps', Steps, {
  props: ['steps', 'current'],
});