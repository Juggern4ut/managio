import { describe, expect, it } from 'vitest'
import { matchKnownCompanies } from '../../../server/services/extraction/companies'

const companies = [
  { id: 'c1', name: 'Migros' },
  { id: 'c2', name: 'Coop' },
]

describe('matchKnownCompanies', () => {
  it('matches a known company name case-insensitively', () => {
    const [match] = matchKnownCompanies('Receipt from MIGROS Zurich', companies)
    expect(match).toMatchObject({ companyId: 'c1', name: 'Migros' })
  })

  it('does not match a substring inside another word', () => {
    // "Coop" should not match inside "Cooperation"
    expect(matchKnownCompanies('Cooperation Inc receipt', companies)).toEqual([])
  })

  it('matches multiple companies mentioned in the same document', () => {
    const matches = matchKnownCompanies('Bought at Migros, previously compared prices at Coop', companies)
    expect(matches.map(m => m.companyId).sort()).toEqual(['c1', 'c2'])
  })

  it('returns nothing when no known company appears', () => {
    expect(matchKnownCompanies('Receipt from Denner', companies)).toEqual([])
  })

  it('handles an empty companies list', () => {
    expect(matchKnownCompanies('Receipt from Migros', [])).toEqual([])
  })
})
