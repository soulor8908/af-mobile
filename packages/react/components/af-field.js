import { AfField as Field } from '@af-mobile/ui/components/af-field.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfField = createWrapper('af-field', Field, {
  props: ['label', 'icon', 'type', 'inputType', 'value', 'placeholder', 'help', 'error', 'disabled', 'readonly', 'ariaLabel'],
  events: ['af-field:input', 'af-field:change'],
});
