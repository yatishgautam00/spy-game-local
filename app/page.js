'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/Firebase/FirebaseConfig'; // your existing export

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login'); // redirect to login if not logged in
      } else {
        router.push('/home'); // redirect to home if logged in
      }
    });

    return () => unsubscribe();
  }, [router]);

  return <div>Loading...</div>;
}
