import { AfBadge as Badge } from '@af-mobile/ui/components/af-badge.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfBadge = createWrapper('af-badge', Badge, {
  props: ['content', 'max', 'dot', 'color'],
});
