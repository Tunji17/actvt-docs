import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Real-time Monitoring',
    emoji: '📊',
    description: (
      <>
        Monitor CPU, GPU, memory, and network activity in real-time directly from your macOS menu bar 
        with beautiful Lottie animations and live graphs.
      </>
    ),
  },
  {
    title: 'Remote Server Support',
    emoji: '🖥️',
    description: (
      <>
        Connect to remote Linux servers via secure WebSocket connections to monitor 
        distributed infrastructure alongside your local system.
      </>
    ),
  },
  {
    title: 'Native Performance',
    emoji: '⚡',
    description: (
      <>
        Built natively for Apple Silicon (M1/M2/M3/M4) using Swift, delivering high performance 
        monitoring with minimal system impact.
      </>
    ),
  },
];

function Feature({title, emoji, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureEmoji}>{emoji}</div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
