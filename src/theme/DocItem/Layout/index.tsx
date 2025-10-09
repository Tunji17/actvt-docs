import React, { useEffect } from 'react';
import Layout from '@theme-original/DocItem/Layout';
import type LayoutType from '@theme/DocItem/Layout';
import type { WrapperProps } from '@docusaurus/types';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import { setCustomTag, trackEvent, upgradeSession } from '@site/src/utils/clarity';

type Props = WrapperProps<typeof LayoutType>;

/**
 * Wrapper for DocItem Layout to track documentation page interactions
 */
export default function LayoutWrapper(props: Props): React.JSX.Element {
  const { metadata } = useDoc();

  useEffect(() => {
    // Track documentation page view
    if (metadata) {
      // Set document-specific tags
      setCustomTag('doc_title', metadata.title);
      setCustomTag('doc_id', metadata.id);

      if (metadata.frontMatter) {
        // Track tags if present
        const tags = metadata.frontMatter.tags;
        if (tags && Array.isArray(tags)) {
          const tagStrings = tags.map((tag: any) =>
            typeof tag === 'string' ? tag : tag?.label || String(tag)
          );
          setCustomTag('doc_tags', tagStrings);
        }
      }

      // Track page view event
      trackEvent('doc_page_viewed');

      // Track reading time
      const readingTime = metadata.frontMatter?.reading_time;
      if (readingTime) {
        setCustomTag('estimated_reading_time', String(readingTime));
      }
    }

    // Track scroll depth
    let maxScroll = 0;
    const handleScroll = () => {
      const scrollPercentage = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );

      if (scrollPercentage > maxScroll) {
        maxScroll = scrollPercentage;

        // Track significant scroll milestones
        if (maxScroll === 25 || maxScroll === 50 || maxScroll === 75 || maxScroll === 100) {
          trackEvent(`doc_scrolled_${maxScroll}percent`);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Track time on page
    const startTime = Date.now();
    return () => {
      window.removeEventListener('scroll', handleScroll);

      // Track session duration on page
      const duration = Math.round((Date.now() - startTime) / 1000); // in seconds
      if (duration > 10) {
        // Only track if user spent more than 10 seconds
        setCustomTag('time_on_page', String(duration));

        // Upgrade session for users who spend significant time reading
        if (duration > 60) {
          upgradeSession('engaged_reader');
        }
      }
    };
  }, [metadata]);

  return <Layout {...props} />;
}
