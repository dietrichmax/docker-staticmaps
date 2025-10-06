import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: '✅ Generate static maps with markers, polygons, circles, polylines and text',
  },
  {
    title: '🌍 Supports multiple basemaps (OpenStreetMap, Esri, Stamen, Carto, custom tile server)',
  },
  {
    title: '⚡ Easy-to-use REST API - simple integration with any frontend or backend',
  },
  {
    title: '🐳 Docker-ready for fast, lightweight deployment',
  },
  {
    title: '🧊 Tile and image caching for performance',
  },
  {
    title: '🚦 Built-in rate limiting per IP to protect against abuse',
  },
];

function Feature({title}: FeatureItem) {
  return (
    <div className={clsx('col row-4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
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
