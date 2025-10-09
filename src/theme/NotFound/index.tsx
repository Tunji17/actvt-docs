import React, { useEffect } from 'react';
import NotFound from '@theme-original/NotFound';
import type NotFoundType from '@theme/NotFound';
import type { WrapperProps } from '@docusaurus/types';
import { useLocation } from '@docusaurus/router';
import { trackEvent, setCustomTag } from '@site/src/utils/clarity';

type Props = WrapperProps<typeof NotFoundType>;

/**
 * Wrapper for NotFound (404) page to track 404 errors
 */
export default function NotFoundWrapper(props: Props): React.JSX.Element {
  const location = useLocation();

  useEffect(() => {
    // Track 404 error
    trackEvent('404_page_not_found');

    // Track the path that caused the 404
    setCustomTag('404_path', location.pathname);

    // Track referrer if available
    if (document.referrer) {
      setCustomTag('404_referrer', document.referrer);
    }
  }, [location.pathname]);

  return <NotFound {...props} />;
}
