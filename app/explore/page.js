'use client';

import React, { Suspense, lazy } from 'react';

const Explore = lazy(() => import('@/component/explore'));

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <Explore />
    </Suspense>
  );
}
