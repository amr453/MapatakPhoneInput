// Copyright (c) 2026 Mapatak Platform. All rights reserved.
// PROPRIETARY & CONFIDENTIAL. Unauthorized copying, modification, or distribution is strictly prohibited.

/**
 * normalizeForSearch — fold orthographic variants so the picker's search
 * matches what users actually type. Used by MapatakPhoneInput to compare
 * a query against a per-country haystack built from all 4 supported
 * locales (ar / en / es / ur).
 *
 * Folds applied:
 *   - Arabic harakat (U+064B..U+065F) + dagger alef (U+0670) + tatweel
 *     (U+0640) are stripped.
 *   - Every alef variant (آ أ إ ٱ ٲ ٳ) collapses to bare alef ا — so
 *     "الأردن" / "الاردن" / "الإردن" all collide.
 *   - Alef maksura ى → ya ي. Ta marbuta ة → ha ه. Hamza-on-waw ؤ → و.
 *     Hamza-on-ya ئ → ي. Lone hamza ء is dropped.
 *   - Latin diacritics: NFD decomposition then combining marks stripped
 *     so "España" matches "Espana".
 *   - lower-cased + trimmed at the end.
 *
 * Pure + idempotent.
 */
export function normalizeForSearch(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFKC");

  // Arabic diacritics (harakat) + dagger alef + tatweel.
  s = s.replace(/[ً-ٰٟـ]/g, "");

  // Alef variants → bare alef.
  s = s.replace(/[آأإٱٲٳ]/g, "ا");
  // Alef maksura → ya.
  s = s.replace(/ى/g, "ي");
  // Ta marbuta → ha.
  s = s.replace(/ة/g, "ه");
  // Hamza-on-waw / hamza-on-ya → bare waw / ya.
  s = s.replace(/ؤ/g, "و").replace(/ئ/g, "ي");
  // Lone hamza dropped.
  s = s.replace(/ء/g, "");

  // Latin diacritics: NFD then strip combining marks.
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");

  return s.toLowerCase().trim();
}
