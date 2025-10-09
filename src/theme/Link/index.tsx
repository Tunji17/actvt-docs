import React from 'react';
import DocusaurusLink from '@docusaurus/Link';
import type { Props as LinkProps } from '@docusaurus/Link';
import { trackExternalLink, trackEvent } from '@site/src/utils/clarity';

/**
 * Custom Link component to track external and internal link clicks
 * This overrides the default Docusaurus Link
 */
export default function Link(props: LinkProps): React.JSX.Element {
  const { href, children, onClick, ...restProps } = props;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call original onClick if provided
    if (onClick) {
      onClick(e);
    }

    if (href) {
      // Check if it's an external link
      const isExternal = /^https?:\/\//.test(href) && !href.includes(window.location.hostname);

      if (isExternal) {
        trackExternalLink(href);
      } else if (href.startsWith('#')) {
        // Track anchor link clicks
        trackEvent('anchor_link_clicked');
      } else if (href.startsWith('/')) {
        // Track internal navigation
        trackEvent('internal_link_clicked');
      }
    }
  };

  return (
    <DocusaurusLink href={href} {...restProps} onClick={handleClick}>
      {children}
    </DocusaurusLink>
  );
}
