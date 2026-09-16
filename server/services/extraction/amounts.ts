export interface AmountMatch {
  amountMinorUnits: number
  currency: string
  rawText: string
  index: number
  method: string
  confidence: number
}

interface CurrencyPattern {
  currency: string
  regex: RegExp
}

// A money-shaped number: digits optionally grouped in 3s by a thousands
// separator (., ,, ', or ’), optionally followed by a decimal separator
// (. or ,) and 1-2 digits. Deliberately precise — an earlier, looser
// `[\d'’.,]+` character class would greedily swallow trailing sentence
// punctuation, e.g. capturing "100.00," out of "CHF 100.00, Tax...".
const NUMBER = String.raw`\d{1,3}(?:[.,'’]\d{3})*(?:[.,]\d{1,2})?`

// Swiss formatting uses ' or ’ as the thousands separator and . as the
// decimal point (e.g. "1'234.50"). Some scans/OCR also produce "," as the
// decimal separator. Only extract amounts adjacent to a currency marker —
// a bare number is too ambiguous (quantities, item counts, page numbers).
const CURRENCY_PATTERNS: CurrencyPattern[] = [
  { currency: 'CHF', regex: new RegExp(String.raw`CHF\s?(${NUMBER})`, 'gi') },
  { currency: 'CHF', regex: new RegExp(String.raw`(${NUMBER})\s?CHF`, 'gi') },
  { currency: 'CHF', regex: new RegExp(String.raw`Fr\.?\s?(${NUMBER})`, 'gi') },
  { currency: 'EUR', regex: new RegExp(String.raw`EUR\s?(${NUMBER})`, 'gi') },
  { currency: 'EUR', regex: new RegExp(String.raw`(${NUMBER})\s?EUR`, 'gi') },
  { currency: 'EUR', regex: new RegExp(String.raw`€\s?(${NUMBER})`, 'gi') },
  { currency: 'USD', regex: new RegExp(String.raw`USD\s?(${NUMBER})`, 'gi') },
  { currency: 'USD', regex: new RegExp(String.raw`\$\s?(${NUMBER})`, 'gi') },
]

// Parses a locale-ambiguous number string into a float, or null if it
// doesn't look like a plausible amount. Never guesses when genuinely
// ambiguous — e.g. "1.234" (thousands sep? decimal?) is rejected rather
// than silently picked one way.
export function parseAmountString(raw: string): number | null {
  const cleaned = raw.trim()
  if (!/\d/.test(cleaned)) return null

  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')
  const hasApostrophe = /['’]/.test(cleaned)

  let normalized: string

  if (hasApostrophe) {
    // Apostrophe is unambiguously a thousands separator in this context.
    normalized = cleaned.replaceAll(/['’]/g, '')
    if (hasComma && !hasDot) normalized = normalized.replace(',', '.')
  }
  else if (hasComma && hasDot) {
    // Whichever separator appears last is the decimal point.
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    normalized = lastComma > lastDot
      ? cleaned.replaceAll('.', '').replace(',', '.')
      : cleaned.replaceAll(',', '')
  }
  else if (hasComma) {
    // A single comma with exactly 2 trailing digits is a decimal point.
    // Anything else (multiple commas, other trailing-digit counts) is
    // ambiguous here and rejected rather than guessed.
    const commaCount = (cleaned.match(/,/g) ?? []).length
    if (commaCount === 1 && /,\d{2}$/.test(cleaned)) {
      normalized = cleaned.replace(',', '.')
    }
    else {
      return null
    }
  }
  else {
    normalized = cleaned
  }

  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : null
}

export function findAmounts(text: string): AmountMatch[] {
  const matches: AmountMatch[] = []

  for (const pattern of CURRENCY_PATTERNS) {
    for (const match of text.matchAll(pattern.regex)) {
      const raw = match[1]
      if (!raw) continue
      const value = parseAmountString(raw)
      if (value === null) continue

      matches.push({
        amountMinorUnits: Math.round(value * 100),
        currency: pattern.currency,
        rawText: match[0],
        index: match.index,
        method: `regex:${pattern.currency.toLowerCase()}_amount`,
        confidence: 0.85,
      })
    }
  }

  return matches.sort((a, b) => a.index - b.index)
}
