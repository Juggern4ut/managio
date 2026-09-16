import { describe, expect, it } from 'vitest'
import { textColorForBackground } from '../../app/utils/color'

describe('textColorForBackground', () => {
  it('picks dark text for a light background', () => {
    expect(textColorForBackground('#fde68a')).toBe('#111827')
  })

  it('picks white text for a dark background', () => {
    expect(textColorForBackground('#1f2937')).toBe('#ffffff')
  })

  it('picks white text for a saturated mid-tone blue', () => {
    expect(textColorForBackground('#2563eb')).toBe('#ffffff')
  })

  it('falls back to dark text for an invalid color rather than throwing', () => {
    expect(textColorForBackground('not-a-color')).toBe('#111827')
  })
})
