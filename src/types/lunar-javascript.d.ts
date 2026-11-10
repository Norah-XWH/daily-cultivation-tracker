declare module "lunar-javascript" {
  interface LunarDate {
    getYear(): number
    getMonth(): number
    getDay(): number
    getMonthInChinese(): string
    getDayInChinese(): string
    getYearInChinese(): string
  }

  interface SolarDate {
    getLunar(): LunarDate
    getJulianDay(): number
    toString(): string
  }

  interface SolarStatic {
    fromYmd(year: number, month: number, day: number): SolarDate
    fromJulianDay(jd: number): SolarDate
  }

  interface LunarMonth {
    getMonth(): number
    isLeap(): boolean
    getDayCount(): number
    getFirstJulianDay(): number
  }

  interface LunarYear {
    getYear(): number
    getLeapMonth(): number
    getMonths(): LunarMonth[]
  }

  interface LunarYearStatic {
    fromYear(year: number): LunarYear
  }

  export const Solar: SolarStatic
  export const LunarYear: LunarYearStatic
}
