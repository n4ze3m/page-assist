const UNITS = [
  "byte",
  "kilobyte",
  "megabyte",
  "gigabyte",
  "terabyte",
  "petabyte"
]

const getValueAndUnit = (n: number) => {
  const i = n == 0 ? 0 : Math.floor(Math.log(n) / Math.log(1024))
  const value = n / Math.pow(1024, i)
  return { value, unit: UNITS[i] }
}

export const bytePerSecondFormatter = (n: number) => {
  const { unit, value } = getValueAndUnit(n)
  return new Intl.NumberFormat("en", {
    notation: "compact",
    style: "unit",
    unit
  }).format(value)
}
