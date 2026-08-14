import { AfDropdown as Dropdown } from 'aiflow-ui/components/af-dropdown.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfDropdown = createWrapper('af-dropdown', Dropdown, {
  props: ['options', 'value', 'placeholder', 'triggerClass', 'disabled'],
  events: ['af-dropdown:select', 'af-dropdown:close'],
  model: { event: 'af-dropdown:select', key: 'value', target: 'value' },
});
