import { AfStepper as Stepper } from 'aiflow-ui/components/af-stepper.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfStepper = createWrapper('af-stepper', Stepper, {
  props: ['value', 'min', 'max', 'step', 'disabled', 'ariaLabel'],
  events: ['af-stepper:change'],
});
