import React, { useEffect } from 'react';
import SearchBar from '@theme-original/SearchBar';
import type SearchBarType from '@theme/SearchBar';
import type { WrapperProps } from '@docusaurus/types';
import { trackSearchQuery, trackEvent } from '@site/src/utils/clarity';

type Props = WrapperProps<typeof SearchBarType>;

/**
 * Wrapper for SearchBar to track search queries
 */
export default function SearchBarWrapper(props: Props): React.JSX.Element {
  useEffect(() => {
    // Track when search bar is used
    const handleSearchInput = (e: Event) => {
      const input = e.target as HTMLInputElement;
      const query = input.value;

      // Debounce tracking to avoid too many events
      if (query && query.length > 2) {
        const timeoutId = setTimeout(() => {
          trackSearchQuery(query);
        }, 1000); // Wait 1 second after user stops typing

        return () => clearTimeout(timeoutId);
      }
    };

    const handleSearchFocus = () => {
      trackEvent('search_bar_focused');
    };

    // Add event listeners to search input
    const searchInput = document.querySelector('input[type="search"]');
    if (searchInput) {
      searchInput.addEventListener('input', handleSearchInput);
      searchInput.addEventListener('focus', handleSearchFocus);

      return () => {
        searchInput.removeEventListener('input', handleSearchInput);
        searchInput.removeEventListener('focus', handleSearchFocus);
      };
    }
  }, []);

  // Track search result clicks
  useEffect(() => {
    const handleSearchResultClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is on a search result
      if (target.closest('.search-result-match')) {
        trackEvent('search_result_clicked');
      }
    };

    document.addEventListener('click', handleSearchResultClick);
    return () => document.removeEventListener('click', handleSearchResultClick);
  }, []);

  return <SearchBar {...props} />;
}
