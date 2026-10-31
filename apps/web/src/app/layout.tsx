import React from 'react';

export const metadata = {
  title: 'LocalPilot — Honest Local Business Growth',
  description: 'Evidence-grounded local business marketing workspace.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, sans-serif', backgroundColor: '#fffdfb', color: '#0d0d12' }}>
        {children}
      </body>
    </html>
  );
}
