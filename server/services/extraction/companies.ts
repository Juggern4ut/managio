export interface CompanyMatch {
  companyId: string
  name: string
  rawText: string
  index: number
  method: 'company_name_match'
  confidence: number
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Matches OCR text against companies already known to this Managio
// instance (an exact, case-insensitive name match) — not a general
// company-name recognizer, which needs an AI/NER model (a later phase).
export function matchKnownCompanies(
  text: string,
  companies: { id: string, name: string }[],
): CompanyMatch[] {
  const matches: CompanyMatch[] = []

  for (const company of companies) {
    const trimmedName = company.name.trim()
    if (trimmedName.length < 2) continue

    const regex = new RegExp(`\\b${escapeRegExp(trimmedName)}\\b`, 'i')
    const match = regex.exec(text)
    if (match) {
      matches.push({
        companyId: company.id,
        name: company.name,
        rawText: match[0],
        index: match.index,
        method: 'company_name_match',
        confidence: 0.8,
      })
    }
  }

  return matches.sort((a, b) => a.index - b.index)
}
