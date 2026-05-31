import { parseTitle, parseMileage, parsePrice } from './parser.js'

describe('parseTitle', () => {
  it('parses standard Honda title', () => {
    expect(parseTitle('2012 Honda Civic LX')).toEqual({ year: 2012, make: 'Honda', model: 'Civic LX' })
  })

  it('parses Toyota title', () => {
    expect(parseTitle('2005 Toyota Corolla CE')).toEqual({ year: 2005, make: 'Toyota', model: 'Corolla CE' })
  })

  it('parses single-word model', () => {
    expect(parseTitle('2018 Honda Fit')).toEqual({ year: 2018, make: 'Honda', model: 'Fit' })
  })

  it('returns nulls when no year present', () => {
    expect(parseTitle('Honda Civic')).toEqual({ year: null, make: null, model: null })
  })

  it('returns nulls for empty string', () => {
    expect(parseTitle('')).toEqual({ year: null, make: null, model: null })
  })

  it('rejects year below 1990', () => {
    expect(parseTitle('1985 Honda Civic')).toEqual({ year: null, make: null, model: null })
  })

  it('accepts year 2005 (boundary)', () => {
    expect(parseTitle('2005 Honda CR-V EX')).toEqual({ year: 2005, make: 'Honda', model: 'CR-V EX' })
  })

  it('accepts year 2030 (upper boundary)', () => {
    const r = parseTitle('2030 Toyota Camry XSE')
    expect(r.year).toBe(2030)
    expect(r.make).toBe('Toyota')
  })
})

describe('parseMileage', () => {
  it('parses mileage with commas', () => {
    expect(parseMileage(['120,000 km'])).toBe(120000)
  })

  it('parses mileage without commas', () => {
    expect(parseMileage(['85000km'])).toBe(85000)
  })

  it('returns null when no match', () => {
    expect(parseMileage(['good condition', 'one owner'])).toBeNull()
  })

  it('picks first matching subtitle', () => {
    expect(parseMileage(['one owner', '95,000 km', '200,000 km'])).toBe(95000)
  })

  it('returns null for empty array', () => {
    expect(parseMileage([])).toBeNull()
  })

  it('handles uppercase KM', () => {
    expect(parseMileage(['50,000 KM'])).toBe(50000)
  })

  it('ignores subtitle without km unit', () => {
    expect(parseMileage(['Manual transmission', 'Clean title'])).toBeNull()
  })
})

describe('parsePrice', () => {
  it('parses price with comma', () => {
    expect(parsePrice('4,500')).toBe(4500)
  })

  it('parses price without comma', () => {
    expect(parsePrice('6000')).toBe(6000)
  })

  it('returns null for undefined', () => {
    expect(parsePrice(undefined)).toBeNull()
  })

  it('returns null for non-numeric string', () => {
    expect(parsePrice('free')).toBeNull()
  })

  it('parses large price with multiple commas', () => {
    expect(parsePrice('12,500')).toBe(12500)
  })
})
