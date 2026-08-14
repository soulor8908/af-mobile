import { AfImg as Img } from 'aiflow-ui/components/af-img.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfImg = createWrapper('af-img', Img, {
  props: ['src', 'alt', 'placeholderSrc', 'failSrc', 'variant', 'rootMargin', 'lazy'],
  events: ['af-img:load', 'af-img:error'],
});
