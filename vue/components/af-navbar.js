import { AfNavbar as Navbar } from '@af-mobile/ui/components/af-navbar.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfNavbar = createWrapper('af-navbar', Navbar, {
  props: ['title', 'showBack', 'backText', 'backAriaLabel'],
  events: ['af-navbar:back'],
});
