import { StandardFonts } from 'pdf-lib';
import type { FontFamily } from '@/constants/fonts';

export function getFontName(
  fontFamily: FontFamily,
  fontWeight: 'normal' | 'bold',
  fontStyle: 'normal' | 'italic',
): (typeof StandardFonts)[keyof typeof StandardFonts] {
  if (fontFamily === 'Helvetica') {
    if (fontWeight === 'bold' && fontStyle === 'italic') return StandardFonts.HelveticaBoldOblique;
    if (fontWeight === 'bold') return StandardFonts.HelveticaBold;
    if (fontStyle === 'italic') return StandardFonts.HelveticaOblique;
    return StandardFonts.Helvetica;
  }
  if (fontFamily === 'Times') {
    if (fontWeight === 'bold' && fontStyle === 'italic') return StandardFonts.TimesRomanBoldItalic;
    if (fontWeight === 'bold') return StandardFonts.TimesRomanBold;
    if (fontStyle === 'italic') return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  // Courier
  if (fontWeight === 'bold' && fontStyle === 'italic') return StandardFonts.CourierBoldOblique;
  if (fontWeight === 'bold') return StandardFonts.CourierBold;
  if (fontStyle === 'italic') return StandardFonts.CourierOblique;
  return StandardFonts.Courier;
}
