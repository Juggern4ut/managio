// Relative luminance (WCAG-style, simplified): picks readable black or
// white text for an arbitrary background color, so user-chosen type colors
// never produce unreadable badges.
export function textColorForBackground(hex: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) return '#111827'

  const value = match[1]!
  const channels = [0, 2, 4].map((i) => {
    const c = Number.parseInt(value.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  const luminance = 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
  return luminance > 0.5 ? '#111827' : '#ffffff'
}
