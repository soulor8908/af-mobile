import { AfStepper as Stepper } from '@af-mobile/ui/components/af-stepper.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfStepper = createWrapper('af-stepper', Stepper, {
  props: ['value', 'min', 'max', 'step', 'disabled', 'ariaLabel'],
  events: ['af-stepper:change'],
  model: { event: 'af-stepper:change', key: 'value', target: 'value' },
});
