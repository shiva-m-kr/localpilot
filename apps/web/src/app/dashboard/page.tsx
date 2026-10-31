'use client';

import React from 'react';
import { OverviewDashboard } from '@localpilot/ui';

export default function DashboardPage() {
  return (
    <main style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      <OverviewDashboard
        organizationName="Apex Plumbing Group"
        locationName="Apex Plumbing - Downtown Location"
        isAutomationPaused={false}
        isDemoData={true}
        gscConnected={false}
        gbpConnected={true}
        wordpressConnected={true}
        metaConnected={false}
        creditsUsed={120}
        creditsLimit={500}
        onNavigateTo={(module) => console.log('Navigate to:', module)}
        onConnectProvider={(provider) => console.log('Connect provider:', provider)}
        onToggleAutomationPause={() => console.log('Toggle pause')}
      />
    </main>
  );
}
