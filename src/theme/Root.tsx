import React, { useEffect } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useLocation } from '@docusaurus/router';
import { trackPageNavigation, setCustomTag } from '@site/src/utils/clarity';

/**
 * Root component wrapper for Docusaurus
 * This component wraps the entire application and is used to inject
 * Microsoft Clarity tracking script and handle global tracking events
 */
export default function Root({ children }: { children: React.ReactNode }) {
  const { siteConfig } = useDocusaurusContext();
  const location = useLocation();
  const clarityProjectId = siteConfig.themeConfig?.clarityProjectId as
    | string
    | undefined;

  // Initialize Clarity
  useEffect(() => {
    // Only load Clarity if we have a project ID and we're in the browser
    if (
      typeof window === 'undefined' ||
      !clarityProjectId ||
      window.clarity
    ) {
      return;
    }

    try {
      // Initialize Clarity
      (function (c: Window, l: Document, a: string, r: string, i: string, t?: HTMLScriptElement, y?: Element) {
        c[a] =
          c[a] ||
          function (...args: any[]) {
            (c[a].q = c[a].q || []).push(args);
          };
        t = l.createElement(r) as HTMLScriptElement;
        t.async = true;
        t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0];
        y.parentNode?.insertBefore(t, y);
      })(window as any, document, 'clarity', 'script', clarityProjectId);

      // Set initial session tags
      setCustomTag('site', 'documentation');
      setCustomTag('site_version', siteConfig.customFields?.version as string || 'v1');
    } catch (error) {
      console.error('Error initializing Microsoft Clarity:', error);
    }
  }, [clarityProjectId, siteConfig]);

  // Track page navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      trackPageNavigation(location.pathname);

      // Set page-specific tags
      const pathSegments = location.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        setCustomTag('doc_section', pathSegments[0]);
      }
    }
  }, [location.pathname]);

  return <>{children}</>;
}
