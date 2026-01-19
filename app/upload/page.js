'use client';

import React, { Suspense, lazy } from 'react';
import layoutStyles from '@/styles/Explore.module.css';

const AudioUpload = lazy(() => import('@/component/upload'));

export default function UploadPage() {
  return (
    <div className={layoutStyles.container}>
      <div className={layoutStyles.exploreSection}>
        <h1>Upload Audio</h1>
        <Suspense fallback={<p className={layoutStyles.loadingText}>Loading uploader...</p>}>
          <AudioUpload />
        </Suspense>
      </div>
    </div>
  );
}
