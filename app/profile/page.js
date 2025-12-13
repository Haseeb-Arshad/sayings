'use client';

import React, { Suspense, lazy } from 'react';

const Profile = lazy(() => import('@/component/profile'));

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Profile />
    </Suspense>
  );
}
