// TEAM_003: Service Worker registration component
'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
    useEffect(() => {
        // Check NODE_ENV only - not hostname (we run production on localhost too)
        // In actual development (npm run dev), process.env.NODE_ENV === 'development'
        // In production build (npm run start), process.env.NODE_ENV === 'production'
        const isDev = process.env.NODE_ENV === 'development';

        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            if (isDev) {
                // In development mode only, unregister service workers
                console.log('[SW] Development mode - skipping Service Worker registration');
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (const registration of registrations) {
                        console.log('[SW] Unregistering:', registration.scope);
                        registration.unregister();
                    }
                });
                return;
            }

            // Production mode - register the service worker
            console.log('[SW] Production mode - registering Service Worker');
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('[SW] Service Worker registered with scope:', registration.scope);

                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('[SW] New service worker available');
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.error('[SW] Service Worker registration failed:', error);
                });

            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[SW] Controller changed');
            });
        }
    }, []);

    return null;
}

export default ServiceWorkerRegistration;
