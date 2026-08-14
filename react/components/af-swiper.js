import { AfSwiper as Swiper } from 'aiflow-ui/components/af-swiper.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfSwiper = createWrapper('af-swiper', Swiper, {
  props: ['activeIndex', 'autoplay', 'loop', 'duration', 'showDots', 'disabled'],
  events: ['af-swiper:change'],
});
