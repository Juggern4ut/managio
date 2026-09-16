export interface LabeledMatch {
  value: string
  rawText: string
  index: number
  method: string
  confidence: number
}

// German/French/English invoice-number labels, each capturing an
// alphanumeric code after the label.
const INVOICE_NUMBER_PATTERNS: { regex: RegExp, method: string }[] = [
  { regex: /rechnungs?-?nr\.?\s*:?\s*([A-Z0-9][A-Z0-9/-]{2,29})/gi, method: 'keyword:invoice_number_de' },
  { regex: /rechnungsnummer\s*:?\s*([A-Z0-9][A-Z0-9/-]{2,29})/gi, method: 'keyword:invoice_number_de' },
  { regex: /invoice\s*(?:no\.?|number|#)\s*:?\s*([A-Z0-9][A-Z0-9/-]{2,29})/gi, method: 'keyword:invoice_number_en' },
  { regex: /(?:n°|no\.?)\s*de\s*facture\s*:?\s*([A-Z0-9][A-Z0-9/-]{2,29})/gi, method: 'keyword:invoice_number_fr' },
]

const COUPON_CODE_PATTERNS: { regex: RegExp, method: string }[] = [
  { regex: /gutscheincode\s*:?\s*([A-Z0-9][A-Z0-9-]{2,29})/gi, method: 'keyword:coupon_code_de' },
  { regex: /promo(?:tion)?\s*code\s*:?\s*([A-Z0-9][A-Z0-9-]{2,29})/gi, method: 'keyword:coupon_code_en' },
  { regex: /coupon\s*code\s*:?\s*([A-Z0-9][A-Z0-9-]{2,29})/gi, method: 'keyword:coupon_code_en' },
  { regex: /code\s*promo\s*:?\s*([A-Z0-9][A-Z0-9-]{2,29})/gi, method: 'keyword:coupon_code_fr' },
]

function extractByPatterns(text: string, patterns: { regex: RegExp, method: string }[], confidence: number): LabeledMatch[] {
  const matches: LabeledMatch[] = []
  for (const { regex, method } of patterns) {
    for (const match of text.matchAll(regex)) {
      const value = match[1]
      if (!value) continue
      matches.push({ value, rawText: match[0], index: match.index, method, confidence })
    }
  }
  return matches.sort((a, b) => a.index - b.index)
}

export function findInvoiceNumbers(text: string): LabeledMatch[] {
  return extractByPatterns(text, INVOICE_NUMBER_PATTERNS, 0.7)
}

export function findCouponCodes(text: string): LabeledMatch[] {
  return extractByPatterns(text, COUPON_CODE_PATTERNS, 0.7)
}

export const DUE_DATE_KEYWORD = /f[äa]llig(?:keitsdatum)?(?:\s*am)?|zahlbar\s*bis|due\s*date|payment\s*due|à\s*payer\s*avant/i

export const COUPON_EXPIRATION_KEYWORD = /g[üu]ltig\s*bis|ablaufdatum|valid\s*until|expir(?:es|ation)/i
