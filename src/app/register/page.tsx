"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0c0c0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#a1a1aa', fontSize: '13px' }}>Redirecting to secure gateway...</p>
    </div>
  );
}
