export function parseTitle(title: string): { year: number | null; make: string | null; model: string | null } {
  const match = title.trim().match(/^((?:19|20)\d{2})\s+(\S+)\s+(.+)$/)
  if (!match) return { year: null, make: null, model: null }
  const year = parseInt(match[1], 10)
  if (year < 1990 || year > 2030) return { year: null, make: null, model: null }
  return { year, make: match[2], model: match[3].trim() }
}

export function parseMileage(subtitles: string[]): number | null {
  for (const subtitle of subtitles) {
    // "265K km" — K thousands abbreviation (Facebook's format)
    const kMatch = subtitle.match(/(\d+(?:\.\d+)?)\s*[Kk]\s+km/i)
    if (kMatch) {
      const value = Math.round(parseFloat(kMatch[1]) * 1000)
      if (value > 0) return value
    }
    // "180,000 km" / "180 000 km" / "180000 km" / "Kilometres"
    const full = subtitle.match(/(\d[\d,\s]*\d|\d+)\s*(?:km|kilomet)/i)
    if (full) {
      const value = parseInt(full[1].replace(/[,\s]/g, ''), 10)
      if (!isNaN(value) && value > 0) return value
    }
  }
  return null
}

export function parsePrice(amount: string | undefined): number | null {
  if (!amount) return null
  const value = parseInt(amount.replace(/,/g, ''), 10)
  return isNaN(value) ? null : value
}
