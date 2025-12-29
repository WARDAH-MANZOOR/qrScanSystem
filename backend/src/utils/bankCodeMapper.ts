// import { BANK_CODES } from "../constants/bankCodes.js";
// import  CustomError  from "./custom_error.js";

// export function mapBankCode(bankCode: number) {
//   const bankName = BANK_CODES[bankCode];

//   if (!bankName) {
//     throw new CustomError("Invalid or unsupported bank code", 400);
//   }

//   return {
//     bankCode,
//     bankName
//   };
// }
// utils/bankCodeMapper.ts
import { BANK_CODES } from "../constants/bankCodes.js";
import CustomError from "./custom_error.js";

export function mapBankCode(input: string) {
  const numericCode = Object.entries(BANK_CODES).find(
    ([numCode, abbr]) => abbr.toUpperCase() === input.toUpperCase()
  )?.[0];

  if (!numericCode) {
    throw new CustomError("Invalid or unsupported bank code", 400);
  }

  return {
    bankCode: Number(numericCode), // numeric code used internally
    bankName: BANK_CODES[Number(numericCode)],
  };
}
