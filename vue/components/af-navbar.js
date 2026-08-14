import { AfNavbar as Navbar } from 'aiflow-ui/components/af-navbar.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfNavbar = createWrapper('af-navbar', Navbar, {
  props: ['title', 'showBack', 'backText', 'backAriaLabel'],
  events: ['af-navbar:back'],
});
