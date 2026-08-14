import { AfSkeletonPage as SkeletonPage } from '@af-mobile/ui/components/af-skeleton-page.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfSkeletonPage = createWrapper('af-skeleton-page', SkeletonPage, {
  props: ['variant'],
});
