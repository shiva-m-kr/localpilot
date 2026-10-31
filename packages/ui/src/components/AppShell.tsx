import React, { useState } from 'react';
import { designTokens } from '../tokens.js';
import { StatusBadge } from './StatusBadge.js';
import { Drawer } from './Drawer.js';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  isAvailable: boolean;
  statusTag?: string;
}

export interface TenantSelection {
  organizationId: string;
  organizationName: string;
  businessId: string;
  businessName: string;
  locationId: string;
  locationName: string;
}

export interface AppShellProps {
  currentTenant: TenantSelection;
  availableOrganizations: { id: string; name: string }[];
  availableLocations: { id: string; name: string }[];
  onTenantChange: (newOrgId: string, newLocationId: string) => void;
  activeNavId: string;
  isAutomationPaused: boolean;
  onToggleAutomationPause?: () => void;
  isDemoMode?: boolean;
  userEmail: string;
  children: React.ReactNode;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: '📊', href: '/dashboard', isAvailable: true },
  { id: 'calendar', label: 'Calendar', icon: '📅', href: '/dashboard/calendar', isAvailable: true },
  { id: 'studio', label: 'Studio', icon: '✍️', href: '/dashboard/studio', isAvailable: true },
  { id: 'rankings', label: 'Rankings', icon: '📍', href: '/dashboard/rankings', isAvailable: true },
  { id: 'profile', label: 'Business Profile', icon: '🏢', href: '/dashboard/profile', isAvailable: true },
  { id: 'reviews', label: 'Reviews', icon: '⭐', href: '/dashboard/reviews', isAvailable: true },
  { id: 'social', label: 'Social Feeds', icon: '📱', href: '/dashboard/social', isAvailable: true },
  { id: 'website', label: 'Website & SEO', icon: '🌐', href: '/dashboard/website', isAvailable: true },
  { id: 'citations', label: 'Citations', icon: '📑', href: '/dashboard/citations', isAvailable: true },
  { id: 'intelligence', label: 'Local Intelligence', icon: '💡', href: '/dashboard/intelligence', isAvailable: true },
  { id: 'reports', label: 'Reports', icon: '📈', href: '/dashboard/reports', isAvailable: true }
];

export const AppShell: React.FC<AppShellProps> = ({
  currentTenant,
  availableOrganizations,
  availableLocations,
  onTenantChange,
  activeNavId,
  isAutomationPaused,
  onToggleAutomationPause,
  isDemoMode = false,
  userEmail,
  children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeItem = NAV_ITEMS.find((item) => item.id === activeNavId) || NAV_ITEMS[0];

  const renderNavLinks = () => (
    <nav aria-label="Main Navigation" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === activeNavId;
        return (
          <a
            key={item.id}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: designTokens.radii.control,
              fontFamily: designTokens.typography.fontBody,
              fontSize: '14px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? designTokens.colors.action : designTokens.colors.ink,
              backgroundColor: isActive ? designTokens.colors.surfaceSelected : 'transparent',
              textDecoration: 'none',
              transition: 'background-color 0.15s ease'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span aria-hidden="true">{item.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                {item.label}
              </span>
            </span>
            {!item.isAvailable ? (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: designTokens.radii.pill,
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280'
                }}
              >
                Soon
              </span>
            ) : null}
          </a>
        );
      })}
    </nav>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: designTokens.colors.canvas }}>
      {/* Desktop Sidebar (hidden on mobile via CSS media query or flex container) */}
      <aside
        id="desktop-sidebar"
        style={{
          width: '260px',
          borderRight: `1px solid ${designTokens.colors.border}`,
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 16px',
          boxSizing: 'border-box',
          flexShrink: 0
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: designTokens.colors.action,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '16px',
              fontFamily: designTokens.typography.fontDisplay
            }}
          >
            LP
          </div>
          <span
            style={{
              fontFamily: designTokens.typography.fontDisplay,
              fontSize: '18px',
              fontWeight: 700,
              color: designTokens.colors.ink
            }}
          >
            LocalPilot
          </span>
          {isDemoMode ? (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: designTokens.radii.pill,
                backgroundColor: '#fef3c7',
                color: '#b45309'
              }}
            >
              DEMO
            </span>
          ) : null}
        </div>

        {/* Scoped Organization & Location Switcher */}
        <div
          style={{
            marginBottom: '20px',
            padding: '12px',
            borderRadius: designTokens.radii.card,
            backgroundColor: designTokens.colors.surfaceSoft,
            border: `1px solid ${designTokens.colors.brand200}`
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: designTokens.colors.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>
            Current Location
          </div>
          <select
            aria-label="Select Location"
            value={currentTenant.locationId}
            onChange={(e) => onTenantChange(currentTenant.organizationId, e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '13px',
              fontFamily: designTokens.typography.fontBody,
              fontWeight: 600,
              color: designTokens.colors.ink,
              borderRadius: designTokens.radii.control,
              border: `1px solid ${designTokens.colors.border}`,
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              outline: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {availableLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <div
            title={currentTenant.businessName}
            style={{
              marginTop: '6px',
              fontSize: '12px',
              color: designTokens.colors.textSecondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            🏢 {currentTenant.businessName}
          </div>
        </div>

        {/* Navigation Links */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderNavLinks()}
        </div>

        {/* User Info & Footer */}
        <div
          style={{
            paddingTop: '16px',
            borderTop: `1px solid ${designTokens.colors.border}`,
            fontSize: '12px',
            color: designTokens.colors.textMuted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={userEmail}
        >
          Signed in as: <br />
          <strong style={{ color: designTokens.colors.ink }}>{userEmail}</strong>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Bar */}
        <header
          style={{
            height: '64px',
            borderBottom: `1px solid ${designTokens.colors.border}`,
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
              id="mobile-menu-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '44px',
                minWidth: '44px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px'
              }}
            >
              ☰
            </button>

            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontFamily: designTokens.typography.fontBody }}>
              <span style={{ color: designTokens.colors.textMuted }}>{currentTenant.businessName}</span>
              <span style={{ color: designTokens.colors.border }}>/</span>
              <span style={{ color: designTokens.colors.textMuted }}>{currentTenant.locationName}</span>
              <span style={{ color: designTokens.colors.border }}>/</span>
              <span style={{ fontWeight: 600, color: designTokens.colors.ink }}>{activeItem.label}</span>
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Persistent Automation Pause Indicator */}
            <div
              role="region"
              aria-label="Automation Engine Status"
              onClick={onToggleAutomationPause}
              title={isAutomationPaused ? 'All automated background writes are paused' : 'Automated scheduling active'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: designTokens.radii.pill,
                backgroundColor: isAutomationPaused ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${isAutomationPaused ? '#fecaca' : '#bbf7d0'}`,
                cursor: onToggleAutomationPause ? 'pointer' : 'default',
                fontSize: '12px',
                fontWeight: 600,
                color: isAutomationPaused ? designTokens.colors.danger : designTokens.colors.success
              }}
            >
              <span aria-hidden="true">{isAutomationPaused ? '⏸️' : '▶️'}</span>
              <span>{isAutomationPaused ? 'Automation PAUSED' : 'Automation Active'}</span>
            </div>

            {/* Notifications Indicator */}
            <button
              aria-label="Notifications"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                minWidth: '44px',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: designTokens.radii.control
              }}
            >
              🔔
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '32px 24px', maxWidth: '1232px', boxSizing: 'border-box', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title="Navigation Menu"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px',
              borderRadius: designTokens.radii.card,
              backgroundColor: designTokens.colors.surfaceSoft
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: designTokens.colors.textMuted, marginBottom: '4px' }}>
              CURRENT LOCATION
            </div>
            <select
              value={currentTenant.locationId}
              onChange={(e) => {
                onTenantChange(currentTenant.organizationId, e.target.value);
                setIsMobileMenuOpen(false);
              }}
              style={{
                width: '100%',
                padding: '8px',
                minHeight: '44px',
                borderRadius: designTokens.radii.control,
                border: `1px solid ${designTokens.colors.border}`,
                backgroundColor: '#ffffff',
                fontFamily: designTokens.typography.fontBody,
                fontSize: '14px'
              }}
            >
              {availableLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {renderNavLinks()}
        </div>
      </Drawer>
    </div>
  );
};
