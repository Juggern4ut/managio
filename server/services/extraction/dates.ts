export interface DateMatch {
  iso: string
  rawText: string
  index: number
  method: 'regex:iso_date' | 'regex:swiss_date' | 'regex:swiss_date_short_year'
  confidence: number
}

// Validates by round-tripping through Date.UTC rather than trusting the
// regex alone — a regex happily matches 31.02.2026, a real calendar doesn't.
function toIsoIfValid(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

// 2-digit years: 00-69 -> 2000-2069, 70-99 -> 1970-1999. A reasonable pivot
// for scanned receipts/mail; there's no way to be certain from two digits.
function expandTwoDigitYear(yy: number): number {
  return yy <= 69 ? 2000 + yy : 1900 + yy
}

export function findDates(text: string): DateMatch[] {
  const matches: DateMatch[] = []

  for (const match of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const iso = toIsoIfValid(Number(match[1]), Number(match[2]), Number(match[3]))
    if (iso) {
      matches.push({
        iso,
        rawText: match[0],
        index: match.index,
        method: 'regex:iso_date',
        confidence: 0.9,
      })
    }
  }

  for (const match of text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g)) {
    const iso = toIsoIfValid(Number(match[3]), Number(match[2]), Number(match[1]))
    if (iso) {
      matches.push({
        iso,
        rawText: match[0],
        index: match.index,
        method: 'regex:swiss_date',
        confidence: 0.85,
      })
    }
  }

  for (const match of text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{2})\b(?!\d)/g)) {
    const iso = toIsoIfValid(expandTwoDigitYear(Number(match[3])), Number(match[2]), Number(match[1]))
    if (iso) {
      matches.push({
        iso,
        rawText: match[0],
        index: match.index,
        method: 'regex:swiss_date_short_year',
        confidence: 0.65,
      })
    }
  }

  return dedupeByIsoKeepingHighestConfidence(matches)
}

function dedupeByIsoKeepingHighestConfidence(matches: DateMatch[]): DateMatch[] {
  const byIso = new Map<string, DateMatch>()
  for (const match of matches) {
    const existing = byIso.get(match.iso)
    if (!existing || match.confidence > existing.confidence) {
      byIso.set(match.iso, match)
    }
  }
  return [...byIso.values()].sort((a, b) => a.index - b.index)
}

// Restricts a date search to a window after a label like "fällig am" or
// "gültig bis", so an unrelated date elsewhere in the document isn't
// mistaken for the due date / expiration date.
export function findDateNearKeyword(text: string, keywordPattern: RegExp, windowChars = 40): DateMatch | null {
  const keywordMatch = keywordPattern.exec(text)
  if (!keywordMatch) return null

  const windowStart = keywordMatch.index + keywordMatch[0].length
  const window = text.slice(windowStart, windowStart + windowChars)
  const found = findDates(window)
  if (found.length === 0) return null

  const best = found[0]!
  return { ...best, index: windowStart + best.index }
}
