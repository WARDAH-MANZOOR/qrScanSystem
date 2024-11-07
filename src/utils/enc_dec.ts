import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

// Encryption algorithm and key
const algorithm = process.env.ENCRYPTION_ALGO as string;
const key = Buffer.from(process.env.ENCRYPTION_KEY as string, 'hex'); // 32 bytes key for AES-256

// Encrypt function
function encrypt(text: string) {
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  // Return iv and encrypted data combined
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decrypt function
function decrypt(text: string) {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

// function encrypt_payload(payload: any) {
//   const secretKey = Buffer.from("Myin!tv3ctorjCM@","utf-8")
//   const iv = Buffer.from("mYjC!nc3dibleY3k","utf-8")
//   // Convert payload to a buffer (if it's not already)
//   const payloadBuffer = Buffer.from(payload, 'utf-8');

//   // Create a cipher instance
//   const cipher = crypto.createCipheriv('aes-128-cbc', secretKey, iv);

//   // Encrypt the data
//   let encryptedData = cipher.update(payloadBuffer, 'utf-8', 'hex');
//   encryptedData += cipher.final('hex');

//   return encryptedData;
// }
export {encrypt, decrypt, 
  // encrypt_payload
};
