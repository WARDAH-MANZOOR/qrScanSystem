export const BANK_CODES: Record<number, string> = {
  20: "ABHI",
  23: "AFT",
  46: "BAHL", // bank al habib limited
  43: "ALFH",// bank alfalah
  48: "ABPA",// allied bank
  47: "ASCM",// askari commercial bank
  87: "BOK",
  44: "BKIP",// bank islami pakistan
  67: "Burj",
  90: "FWBL",
  52: "FAYS",// Faysal bank
  49: "HBL",// habib bank limited
  95: "ICBC",
  75: "JS",
  51: "KASB",
  94: "KBL",
  79: "MCB",
  91: "MIB",
  66: "MEZN",// Meezan Bank
  89: "NBP",
  65: "NIB",
  88: "NRSP",
  64: "SCB",
  83: "SIND",
  68: "SAUD",// silk bank
  73: "SIND",// sindh bank
  61: "SONE",// soneri bank
  58: "Summit",// summit bank
  12: "TAG",
  60: "UBL",
  42: "ZTBL"// zarai taraqiati bank
};


// export const BANK_CODES: Record<number, string> = {
//   20: "ABHI",
//   23: "AFT",
// //   13: "AFT IBFT",
// //   96: "Advans",
// //   28: "Al Meezan Investment Management Limited",
//   46: "BAHL", // bank al habib limited
// //   72: "Albarka",
//   43: "ALFH",// bank alfalah
//   48: "ABPA",// allied bank
// //   76: "Apna",
//   47: "ASCM",// askari commercial bank
//   87: "BOK",
// //   105: "BYKEA",
//   44: "BKIP",// bank islami pakistan
//   67: "Burj",
// //   15: "Central Directorate of National Savings",
// //   27: "Central Directorate of National Savings (CDNS)",
// //   122: "Central Directorate of National Savings (CDNS) – 1IBFT IMD Addition",
// //   57: "Citi",
// //   56: "DubaiIslamic",
// //   110: "EZ wage",
// //   59: "EasyPaisa",
// //   86: "FINC",
// //   97: "FINJA",
//   90: "FWBL",
//   52: "FAYS",// Faysal bank
// //   92: "First Microfinance Bank",
//   49: "HBL",// habib bank limited
// //   102: "HBL ASSET MANAGEMENT",
// //   118: "Habib Metro Bank – Bulk 1IBFT",
// //   77: "HabibMetro",
// //   113: "Humrah Financial Services",
//   95: "ICBC",
//   75: "JS",
//   51: "KASB",
//   94: "KBL",
// //   22: "KEENU",
// //   24: "KEENU Bank",
// //   14: "KEENU – IMD and 1IBFT Screen Addition",
// //   115: "Keenu1",
//   79: "MCB",
// //   100: "MCB-Arif Habib",
//   91: "MIB",
//   66: "MEZ",// Meezan Bank
// //   10: "MobilinkBank Pakistan",
// //   99: "NAYAPAY",
//   89: "NBP",
// //   98: "NBP Fund Management Limited",
// //   93: "NBP1",
//   65: "NIB",
//   88: "NRSP",
// //   109: "National Bank",
// //   114: "Numbers Private Limited",
// //   55: "PayMax",
// //   104: "PayMax1",
// //   45: "PunjabBank",
// //   11: "SADAPAY",
//   64: "SCB",
// //   50: "SEEDCREED Financial Services Limited",
// //   30: "SIMPAISA",
//   83: "SIND",
// //   71: "Samba",
//   68: "SAUD",// silk bank
//   73: "SIND",// sindh bank
//   61: "SONE",// soneri bank
//   58: "Summit",// summit bank
//   12: "TAG",
// //   103: "TezPAy",
//   60: "UBL",
// //   85: "UPaisa",
// //   70: "Waseela",
// //   1: "Waseela bank",
// //   101: "ZTBL1",
//   42: "ZTBL"// zarai taraqiati bank
// };

// // 🟢 Abbreviation mapping
// export const BANK_ABBREVIATIONS: Record<string, number> = {
//   ABHI: 20,
//   AFT: 23,
//   AFTIBFT: 13,
//   ADV: 96,
//   ALMEEZAN: 28,
//   ALHABIB: 46,
//   ALBARKA: 72,
//   ALFALAH: 43,
//   ALLIED: 48,
//   APNA: 76,
//   ASKARI: 47,
//   BOK: 87,
//   BYKEA: 105,
//   BANKISLAMI: 44,
//   BURJ: 67,
//   CDNS: 27,
//   CITI: 57,
//   DUBAI: 56,
//   EZWAGE: 110,
//   EASYPaisa: 59,
//   FINC: 86,
//   FINJA: 97,
//   FWBL: 90,
//   FAYSAL: 52,
//   FIRST: 92,
//   HBL: 49,
//   HBLAM: 102,
//   HABIBMETRO: 77,
//   HUMRAH: 113,
//   ICBC: 95,
//   JS: 75,
//   KASB: 51,
//   KBL: 94,
//   KEENU: 22,
//   MCB: 79,
//   MCBARIF: 100,
//   MIB: 91,
//   MEZ: 66,      // ✅ MEZ = Meezan
//   MOBILINK: 10,
//   NAYAPAY: 99,
//   NBP: 89,
//   NBPFM: 98,
//   NBP1: 93,
//   NIB: 65,
//   NRSP: 88,
//   NATIONALBANK: 109,
//   PAYMAX: 55,
//   PAYMAX1: 104,
//   PUNJABBANK: 45,
//   SADAPAY: 11,
//   SCB: 64,
//   SEEDCREED: 50,
//   SIMPAISA: 30,
//   SIND: 83,
//   SAMBA: 71,
//   SILK: 68,
//   SINDHBANK: 73,
//   SONERI: 61,
//   SUMMIT: 58,
//   TAG: 12,
//   TEZPAY: 103,
//   UBL: 60,
//   UPAISA: 85,
//   WASEELA: 70,
//   WASEELABANK: 1,
//   ZTBL1: 101,
//   ZARAI: 42,
// };