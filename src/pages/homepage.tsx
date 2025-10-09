import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import { trackDownload, trackEvent } from '@site/src/utils/clarity';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();

  const handleGetStartedClick = () => {
    trackEvent('get_started_clicked');
  };

  const handleDownloadClick = () => {
    trackDownload(); // Will attempt to detect platform from user agent
    trackEvent('download_button_clicked');
  };

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/"
            onClick={handleGetStartedClick}>
            Get Started 🚀
          </Link>
          <Link
            className="button button--primary button--lg"
            to="https://actvt.io/#download"
            onClick={handleDownloadClick}>
            Download Actvt
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Documentation`}
      description="Real-time system monitoring for macOS with remote server capabilities. Complete documentation for installation, setup, and remote monitoring.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
