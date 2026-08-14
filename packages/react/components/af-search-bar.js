import { AfSearchBar as SearchBar } from '@af-mobile/ui/components/af-search-bar.js';
import { createWrapper } from '../lib/wrapper.js';

export const AfSearchBar = createWrapper('af-search-bar', SearchBar, {
  props: ['value', 'placeholder', 'clearable', 'debounce'],
  events: ['af-search-bar:input', 'af-search-bar:search', 'af-search-bar:clear'],
});
