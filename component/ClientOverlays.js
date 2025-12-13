'use client';

import React, { Suspense, lazy } from 'react';
import { SRLiveRegion } from '@/component/devtools/PerfAndA11y';

const FloatingVoiceButton = lazy(() => import('@/component/floatingButton'));
const ServiceWorkerRegistrar = lazy(() =>
  import('@/component/devtools/PerfAndA11y').then((m) => ({
    default: m.ServiceWorkerRegistrar,
  }))
);
const FPSMeter = lazy(() =>
  import('@/component/devtools/PerfAndA11y').then((m) => ({ default: m.FPSMeter }))
);

export default function ClientOverlays() {
  return (
    <>
      <SRLiveRegion />

      <Suspense fallback={null}>
        <ServiceWorkerRegistrar />
      </Suspense>

      <Suspense fallback={null}>
        <FloatingVoiceButton />
      </Suspense>

      {process.env.NODE_ENV === 'development' && (
        <Suspense fallback={null}>
          <FPSMeter />
        </Suspense>
      )}
    </>
  );
}
