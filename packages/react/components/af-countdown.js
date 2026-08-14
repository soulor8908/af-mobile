import { AfCountdown as Countdown } from '@af-mobile/ui/components/af-countdown.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfCountdown = createWrapper('af-countdown', Countdown, {
  props: ['time', 'autostart'],
  events: ['af-countdown:change', 'af-countdown:end'],
});