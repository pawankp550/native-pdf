/**
 * Fetches TTF font bytes from the Google Fonts CDN for embedding in pdf-lib documents.
 *
 * Strategy:
 *  1. Module-level cache — bytes are fetched once per session regardless of how many
 *     times generatePdf() is called.
 *  2. Uses the Google Fonts CSS v1 API with an old User-Agent so the response contains
 *     TTF src URLs (modern browsers get WOFF2 which pdf-lib cannot use).
 *  3. Falls back to the regular weight when a bold/italic variant is unavailable.
 */

// Module-level cache: key = "Family:weight:style", value = resolved bytes
const cache = new Map<string, Promise<Uint8Array>>();

export function fetchGoogleFontBytes(
  family: string,
  weight: 'normal' | 'bold',
  style: 'normal' | 'italic',
): Promise<Uint8Array> {
  const key = `${family}:${weight}:${style}`;
  if (cache.has(key)) return cache.get(key)!;

  const promise = _fetch(family, weight, style).catch(async err => {
    // If bold or italic variant not found, fall back to regular
    if (weight !== 'normal' || style !== 'italic') {
      console.warn(`Font "${family}" ${weight}/${style} unavailable, trying regular:`, err);
      return _fetch(family, 'normal', 'normal');
    }
    throw err;
  });

  cache.set(key, promise);
  return promise;
}

async function _fetch(
  family: string,
  weight: 'normal' | 'bold',
  style: 'normal' | 'italic',
): Promise<Uint8Array> {
  const w = weight === 'bold' ? 700 : 400;
  const styleParam = style === 'italic' ? 'italic,' : '';
  const familyParam = `${encodeURIComponent(family)}:${styleParam}${w}`;

  // CSS v1 API — old UA causes Google to return TTF src URLs instead of WOFF2
  const cssResp = await fetch(
    `https://fonts.googleapis.com/css?family=${familyParam}&subset=latin`,
    { headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)' } },
  );
  if (!cssResp.ok) throw new Error(`Google Fonts CSS request failed for "${family}" (${cssResp.status})`);

  const css = await cssResp.text();

  // Extract the first TTF/OTF URL from the CSS
  const match = css.match(/url\(([^)]+\.(?:ttf|otf))\)/i);
  if (!match) throw new Error(`No TTF src found in Google Fonts CSS for "${family}" ${weight} ${style}`);

  const fontResp = await fetch(match[1]);
  if (!fontResp.ok) throw new Error(`Failed to download font file for "${family}" (${fontResp.status})`);

  return new Uint8Array(await fontResp.arrayBuffer());
}
