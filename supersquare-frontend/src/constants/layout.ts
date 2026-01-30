// STRICT UI CONSTANTS - DO NOT CHANGE
// Mobile-First Layout Spacing (360-420dp)

export const LAYOUT = {
    // Vertical Spacing
    HEADER_HEIGHT: '4rem',      // 64px
    NAV_HEIGHT: '4rem',         // 64px

    // Content Breathing Room
    SCREEN_PADDING_TOP: '1.5rem',
    // Bottom padding must allow scrolling past the fixed nav bar
    // NAV_HEIGHT (4rem) + Breathing Room (2rem)
    SCREEN_PADDING_BOTTOM: '6rem',

    // Horizontal Spacing
    SCREEN_PADDING_X: '1.25rem', // 20px - comfortable side margins

    // Component Spacing
    SECTION_GAP: '1.5rem',      // Consistent gap between major sections
    ITEM_GAP: '0.75rem',        // Gap between related items
} as const;

export const Z_INDEX = {
    BACKGROUND: 0,
    CONTENT: 10,
    HEADER: 40,
    NAV_BAR: 50,
    MODAL: 100,
} as const;
