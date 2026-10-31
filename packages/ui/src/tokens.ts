/**
 * LocalPilot Design Tokens based on measured Outrank UI and warm peach/orange identity
 */
export const designTokens = {
  typography: {
    fontDisplay: '"Plus Jakarta Sans", sans-serif',
    fontBody: '"Inter", sans-serif',
    hero: {
      desktop: { fontSize: '68px', lineHeight: '81.6px', fontWeight: 700, letterSpacing: '-1.2px' },
      mobile: { fontSize: '38px', lineHeight: '46px', fontWeight: 700, letterSpacing: '-0.8px' }
    },
    sectionHeading: {
      desktop: { fontSize: '56px', lineHeight: '70px', fontWeight: 700, letterSpacing: '-1.44px' }
    }
  },
  colors: {
    canvas: '#fffdfb',
    surface: '#ffffff',
    surfaceSoft: '#fff6ee',
    surfaceSelected: '#ffeddc',
    brand50: '#fff7ed',
    brand100: '#ffedd5',
    brand200: '#fed7aa',
    brand300: '#fdba74',
    brand400: '#fb923c',
    brand500: '#f97316',
    brand600: '#ea580c',
    brand700: '#c2410c',
    action: '#c2410c',
    actionHover: '#9a3412',
    ink: '#0d0d12',
    textSecondary: '#57534e',
    textMuted: '#78716c',
    border: '#e8e2dc',
    focus: '#c2410c',
    success: '#15803d',
    warning: '#a16207',
    danger: '#b91c1c',
    info: '#1d4ed8'
  },
  radii: {
    control: '10px',
    card: '16px',
    panel: '24px',
    pill: '9999px'
  },
  shadows: {
    card: '0 2px 8px rgb(40 24 8 / 4%)',
    float: '0 12px 36px rgb(194 65 12 / 10%)'
  }
} as const;

export type DesignTokens = typeof designTokens;
