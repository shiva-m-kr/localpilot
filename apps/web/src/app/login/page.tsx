'use client';

import React, { useState } from 'react';
import { LoginPage } from '@localpilot/ui';

export default function LoginRoute() {
  const [error, setError] = useState<string | undefined>();

  const handleGoogleSignIn = () => {
    // Redirects to Google OAuth authorization endpoint
    window.location.href = '/api/auth/google';
  };

  const handleEmailSignIn = (email: string) => {
    // Sends magic link email
    console.log(`Sending magic link to ${email}...`);
  };

  const handleEnterDemo = () => {
    // Direct routing to demo workspace session
    window.location.href = '/dashboard?demo=true';
  };

  return (
    <LoginPage
      onGoogleSignIn={handleGoogleSignIn}
      onEmailSignIn={handleEmailSignIn}
      onEnterDemoMode={handleEnterDemo}
      errorMessage={error}
    />
  );
}
