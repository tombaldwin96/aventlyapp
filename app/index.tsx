import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { PreloadScreen } from '@/components/PreloadScreen';

export default function PreloadRoute() {
  const router = useRouter();
  const { user, isRestoring, isLoading } = useAuth();
  const [preloadDone, setPreloadDone] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    if (!preloadDone) return;
    if (navigated.current) return;
    const done = !isRestoring && !isLoading;
    if (!done) return;
    navigated.current = true;
    if (user) {
      if (user.role === 'ADMIN') router.replace('/(app)/admin');
      else if (user.role === 'PERFORMER') router.replace('/(app)/performer');
      else if (user.role === 'BUSINESS') router.replace('/(app)/business');
      else router.replace('/(app)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [preloadDone, isRestoring, isLoading, user, router]);

  return (
    <PreloadScreen
      onFinish={() => setPreloadDone(true)}
      logoReady={true}
    />
  );
}
