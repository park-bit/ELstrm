import { isFavorite } from './storage';

export const ALL_CATEGORY = '__all__';
export const FAVORITES_CATEGORY = '__favorites__';

/**
 * Single source of truth for "which channels are currently visible",
 * given a category selection and search term. Used by both the rendered
 * grid (ChannelBrowser) and the keyboard Enter handler (App) so they can
 * never disagree on what's at a given focus index.
 */
export function getVisibleChannels({ channels, selectedCategory, searchTerm }) {
  let list = channels;

  if (selectedCategory === FAVORITES_CATEGORY) {
    list = list.filter((c) => isFavorite(c));
  } else if (selectedCategory !== ALL_CATEGORY) {
    list = list.filter((c) => c.group === selectedCategory);
  }

  const term = searchTerm.trim().toLowerCase();
  if (term) {
    list = list.filter((c) => c.name.toLowerCase().includes(term));
  }

  return list;
}
