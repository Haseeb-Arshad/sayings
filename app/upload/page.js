'use client';

import React, { Suspense, lazy } from 'react';
import layoutStyles from '@/styles/Explore.module.css';

const AudioUpload = lazy(() => import('@/component/upload'));
const Navbar = lazy(() => import('@/component/navBar'));
const Sidebar = lazy(() => import('@/component/sidebar'));

export default function UploadPage() {
  return (
    <div className={layoutStyles.container}>
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <div className={layoutStyles.mainContent}>
        <Suspense fallback={null}>
          <Sidebar setFilter={() => {}} currentFilter="recent" />
        </Suspense>
        <div className={layoutStyles.exploreSection}>
          <h1>Upload Audio</h1>
          <Suspense fallback={<p className={layoutStyles.loadingText}>Loading uploader...</p>}>
            <AudioUpload />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
