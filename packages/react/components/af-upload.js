import { AfUpload as Upload } from '@af-mobile/ui/components/af-upload.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfUpload = createWrapper('af-upload', Upload, {
  props: ['accept', 'multiple', 'maxSize', 'maxCount', 'buttonText', 'ariaLabelText'],
  events: ['af-upload:change', 'af-upload:error'],
});
