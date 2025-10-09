import React from 'react';
import CodeBlock from '@theme-original/CodeBlock';
import type CodeBlockType from '@theme/CodeBlock';
import type { WrapperProps } from '@docusaurus/types';
import { trackEvent, setCustomTag } from '@site/src/utils/clarity';

type Props = WrapperProps<typeof CodeBlockType>;

/**
 * Wrapper for CodeBlock to track code copy events
 */
export default function CodeBlockWrapper(props: Props): React.JSX.Element {
  const { language } = props;

  React.useEffect(() => {
    // Track code copy events
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;

      // Check if the copy event is from a code block
      if (target.closest('pre') || target.closest('code')) {
        trackEvent('code_copied');

        // Track language if available
        if (language) {
          setCustomTag('copied_code_language', language);
        }
      }
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [language]);

  return <CodeBlock {...props} />;
}
