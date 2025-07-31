'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/firebase/firebaseConfig'; // Adjust path as needed

export default function Home() {
  const router = useRouter();
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login'); // Not logged in → redirect to login
      } else {
        router.push('/home'); // Logged in → redirect to homepage
      }
    });

    return () => unsubscribe();
  }, []);

  return <div>Loading...</div>; // Optional loading UI
}
