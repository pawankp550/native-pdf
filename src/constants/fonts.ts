export const FONT_FAMILIES = [
  // ── Standard PDF fonts (built into every PDF viewer, no embedding needed) ──
  { value: 'Helvetica',        label: 'Helvetica',        google: false },
  { value: 'Times',            label: 'Times Roman',      google: false },
  { value: 'Courier',          label: 'Courier',          google: false },
  // ── Google Fonts (fetched as TTF at export time, loaded via CSS in canvas) ──
  { value: 'Roboto',           label: 'Roboto',           google: true  },
  { value: 'Open Sans',        label: 'Open Sans',        google: true  },
  { value: 'Inter',            label: 'Inter',            google: true  },
  { value: 'Lato',             label: 'Lato',             google: true  },
  { value: 'Montserrat',       label: 'Montserrat',       google: true  },
  { value: 'Poppins',          label: 'Poppins',          google: true  },
  { value: 'Nunito',           label: 'Nunito',           google: true  },
  { value: 'Raleway',          label: 'Raleway',          google: true  },
  { value: 'Oswald',           label: 'Oswald',           google: true  },
  { value: 'Ubuntu',           label: 'Ubuntu',           google: true  },
  { value: 'PT Sans',          label: 'PT Sans',          google: true  },
  { value: 'PT Serif',         label: 'PT Serif',         google: true  },
  { value: 'Merriweather',     label: 'Merriweather',     google: true  },
  { value: 'Playfair Display', label: 'Playfair Display', google: true  },
  { value: 'Noto Sans',        label: 'Noto Sans',        google: true  },
] as const;

export type FontFamily = (typeof FONT_FAMILIES)[number]['value'];

export const STANDARD_PDF_FONTS = new Set<FontFamily>(['Helvetica', 'Times', 'Courier']);

export const GOOGLE_FONTS = FONT_FAMILIES.filter(f => f.google).map(f => f.value);
