/**
 * Windows-1252 extension characters (the 0x80–0x9F range) mapped to their
 * Unicode codepoints. These are the only characters above U+00FF that
 * WinAnsi-encoded standard PDF fonts (Helvetica, Times Roman, etc.) can render.
 */
const WIN1252_EXTRAS = new Set([
  0x20AC, // €
  0x201A, // ‚
  0x0192, // ƒ
  0x201E, // „
  0x2026, // …
  0x2020, // †
  0x2021, // ‡
  0x02C6, // ˆ
  0x2030, // ‰
  0x0160, // Š
  0x2039, // ‹
  0x0152, // Œ
  0x017D, // Ž
  0x2018, // '
  0x2019, // '
  0x201C, // "
  0x201D, // "
  0x2022, // •
  0x2013, // –
  0x2014, // —
  0x02DC, // ˜
  0x2122, // ™
  0x0161, // š
  0x203A, // ›
  0x0153, // œ
  0x017E, // ž
  0x0178, // Ÿ
]);

/**
 * Remove characters that WinAnsi-encoded standard PDF fonts cannot encode.
 * Keeps ASCII (U+0020–U+007E), Latin-1 Supplement (U+00A0–U+00FF), and the
 * 27 Windows-1252 extension characters. Everything else is silently dropped.
 *
 * Characters outside WinAnsi are replaced with a space so word spacing and
 * layout are preserved. Call this before any pdf-lib font operation when using
 * a standard (non-embedded) font.
 */
export function sanitizeForWinAnsi(text: string): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp <= 0x00FF || WIN1252_EXTRAS.has(cp)) {
      out += ch;
    } else {
      out += ' ';
    }
  }
  return out;
}
