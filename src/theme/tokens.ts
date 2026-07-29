/**
 * DAYAR-E-HABIB ERP — GLOBAL DESIGN TOKENS
 * Single Source of Truth for Theme Architecture & Interaction Tokens
 */

export const tokens = {
  colors: {
    // Primary Executive Gold
    primary: {
      default: '#856936',
      hover: '#6E562B',
      light: '#F5EFE2',
      border: '#E2D7C3',
    },

    // Background Canvas
    background: {
      canvas: '#F7F4EC',
      surface: '#FFFFFF',
      sidebar: '#F3ECE0',
      activeTab: '#E5DAC6',
      hoverTab: '#EAE1D2',
    },

    // Typography & Text
    text: {
      primary: '#1E1A16',
      secondary: '#685E52',
      muted: '#8A7C6B',
      disabled: '#9E9282',
    },

    // Status Colors (Standardized Status Language)
    status: {
      completed: { text: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
      active: { text: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
      pending: { text: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
      draft: { text: '#64748B', bg: '#F8FAFC', border: '#CBD5E1' },
      warning: { text: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
      cancelled: { text: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
      archived: { text: '#64748B', bg: '#F1F5F9', border: '#E2E8F0' },
    },
  },

  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    monoFamily: "'JetBrains Mono', 'Fira Code', monospace",

    fontSize: {
      xs: '10px',
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '20px',
      '2xl': '24px',
    },

    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },

  // Explicit Spacing Scale
  spacing: {
    icon: '4px',       // Icon to text gap
    label: '8px',      // Label to control
    input: '12px',     // Control padding
    card: '16px',      // Card internal padding
    section: '24px',   // Section spacing
    page: '32px',      // Page outer padding
  },

  // Elevation Layer System
  elevation: {
    layer0_canvas: 'z-0',
    layer1_card: 'shadow-2xs',
    layer2_dropdown: 'z-20 shadow-md',
    layer3_dialog: 'z-40 shadow-xl',
    layer4_commandPalette: 'z-50 shadow-2xl',
    layer5_toast: 'z-50 shadow-lg',
  },

  // Interaction Tokens
  interaction: {
    hoverDuration: '120ms',
    focusRing: '2px solid rgba(133, 105, 54, 0.3)',
    drawerWidth: '480px',
    modalRadius: '16px',
    toastDuration: 3000,
    skeletonDelay: 200,
  },

  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    full: '9999px',
  },
} as const;

export type ThemeTokens = typeof tokens;
