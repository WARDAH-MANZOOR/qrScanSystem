import crypto from "crypto";
import {
  deriveKeys,
  encryptAESGCM,
  generateHMACSignature
} from "./src/utils/dec_with_signing.js"

interface JazzCashPayload {
  amount: string;
  phone: string;
  type: string;
  order_id: string;
}
interface EasyPaisaPayload {
  amount: string;
  phone: string;
  type: string;
  order_id: string;
  email:String;
}
interface EncryptedData {
  encryptedData: string;
  iv: string;
  tag: string;
}

interface FinalPayload {
  userId: string;
  timestamp: string;
  encrypted_data: string;
  iv: string;
  tag: string;
  signature: string;
}

// // === CONFIGURABLE JAZZCASH===
const userId: string = "test-user"; // Replace with actual
const masterKey: Buffer = Buffer.from("b03ec95611bb436577a6aa29c0d5e022d9def32a5bd6242596a88339669407f0", "utf8"); // Replace with actual secret

const payload: JazzCashPayload = {
  amount: "1",
  phone: "03142304891",
  type: "wallet",
  order_id: "adananjnalnaknklakm",
};

// === ENCRYPTION & SIGNING ===
const { hmacKey, aesKey } = deriveKeys(masterKey);
const timestamp: string = new Date().toISOString();

const encrypted: EncryptedData = encryptAESGCM(JSON.stringify(payload), aesKey);
const signature: string = generateHMACSignature(
  userId + timestamp + encrypted.encryptedData,
  hmacKey
);

const finalPayload: FinalPayload = {
  userId,
  timestamp,
  encrypted_data: encrypted.encryptedData,
  iv: encrypted.iv,
  tag: encrypted.tag,
  signature
};

console.log("✅ Final Payload to use in Postman:");
console.log(JSON.stringify(finalPayload, null, 2));


// === CONFIGURABLE EASYPAISA ===
// const userId: string = "test-user"; // Replace with actual
// const masterKey: Buffer = Buffer.from("b03ec95611bb436577a6aa29c0d5e022d9def32a5bd6242596a88339669407f0", "utf8"); // Replace with actual secret

// const payload: EasyPaisaPayload = {
//     amount: "1",
//     phone: "03162309607",
//     type: "wallet",
//     order_id: "kdnalndlkanlndasla",
//     email: "abc@gmail.com"
// };

// // === ENCRYPTION & SIGNING ===
// const { hmacKey, aesKey } = deriveKeys(masterKey);
// const timestamp: string = new Date().toISOString();

// const encrypted: EncryptedData = encryptAESGCM(JSON.stringify(payload), aesKey);
// const signature: string = generateHMACSignature(
//   userId + timestamp + encrypted.encryptedData,
//   hmacKey
// );

// const finalPayload: FinalPayload = {
//   userId,
//   timestamp,
//   encrypted_data: encrypted.encryptedData,
//   iv: encrypted.iv,
//   tag: encrypted.tag,
//   signature
// };

// console.log("✅ Final Payload to use in Postman:");
// console.log(JSON.stringify(finalPayload, null, 2));
