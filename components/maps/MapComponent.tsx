// Use a dynamic import for map components to avoid SSR issues
// components/maps/MapComponent.tsx
'use client';

import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./MapInner'), { ssr: false });

export default MapComponent;
