import { describe, expect, it } from 'vitest'
import { findDateNearKeyword, findDates } from '../../../server/services/extraction/dates'

describe('findDates', () => {
  it('extracts an ISO date', () => {
    const [match] = findDates('Invoice date: 2026-09-14')
    expect(match).toMatchObject({ iso: '2026-09-14', method: 'regex:iso_date' })
  })

  it('extracts a Swiss DD.MM.YYYY date', () => {
    const [match] = findDates('Rechnung vom 14.09.2026')
    expect(match).toMatchObject({ iso: '2026-09-14', method: 'regex:swiss_date' })
  })

  it('extracts a Swiss date with a 2-digit year, pivoting at 70', () => {
    expect(findDates('14.09.26')[0]).toMatchObject({ iso: '2026-09-14' })
    expect(findDates('14.09.95')[0]).toMatchObject({ iso: '1995-09-14' })
  })

  it('rejects a calendar-invalid date instead of fabricating one', () => {
    expect(findDates('31.02.2026')).toEqual([])
    expect(findDates('2026-13-01')).toEqual([])
    expect(findDates('2026-02-30')).toEqual([])
  })

  it('does not confuse a 2-digit-year match with the tail of a 4-digit year', () => {
    const matches = findDates('14.09.2026')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ iso: '2026-09-14', method: 'regex:swiss_date' })
  })

  it('deduplicates repeated dates, keeping the highest-confidence match', () => {
    const matches = findDates('Date: 2026-09-14. Also written as 14.09.2026.')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ iso: '2026-09-14', method: 'regex:iso_date' })
  })

  it('finds multiple distinct dates in order', () => {
    const matches = findDates('Issued 01.09.2026, due 30.09.2026')
    expect(matches.map(m => m.iso)).toEqual(['2026-09-01', '2026-09-30'])
  })

  it('returns an empty array when there are no dates', () => {
    expect(findDates('no dates here')).toEqual([])
  })
})

describe('findDateNearKeyword', () => {
  it('finds a date shortly after a German due-date label', () => {
    const match = findDateNearKeyword('Betrag CHF 50.00. Fällig am 30.09.2026. Danke.', /f[äa]llig(?:keitsdatum)?(?:\s*am)?/i)
    expect(match).toMatchObject({ iso: '2026-09-30' })
  })

  it('ignores a date that is far outside the search window', () => {
    const farAway = `Fällig am ${'x'.repeat(60)} 30.09.2026`
    expect(findDateNearKeyword(farAway, /f[äa]llig(?:keitsdatum)?(?:\s*am)?/i, 40)).toBeNull()
  })

  it('returns null when the keyword is absent', () => {
    expect(findDateNearKeyword('no relevant keyword, 30.09.2026', /nonexistent-label/i)).toBeNull()
  })
})
