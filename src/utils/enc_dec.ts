import crypto from "crypto";
import dotenv from "dotenv";
import { authenticationService } from "services/index.js";
dotenv.config();

// Encryption algorithm and key
const algorithm = process.env.ENCRYPTION_ALGO as string;
const key = Buffer.from(process.env.ENCRYPTION_KEY as string, 'hex'); // 32 bytes key for AES-256
const iv = crypto.randomBytes(12);

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

function encryptData(payload: any, secretKey: string, iv: string) {
  // Ensure the payload is a JSON string
  const jsonString = JSON.stringify(payload);

  // Create a cipher instance
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(secretKey), Buffer.from(iv));

  // Encrypt the data
  let encryptedData = cipher.update(jsonString, 'utf8', 'hex');
  encryptedData += cipher.final('hex');

  return encryptedData;
}

function decryptData(encryptedData: string, secretKey: string, iv: string) {
  // Create a decipher instance
  const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(secretKey), Buffer.from(iv));

  // Decrypt the data
  let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
  decryptedData += decipher.final('utf8');

  // Parse the decrypted JSON string
  const payload = JSON.parse(decryptedData);

  return payload;
}

async function callbackEncrypt(payload: string, userId: number) {
  try {
    console.log("User Id: ", userId);
    const key = await authenticationService.getDecryptionKey(userId);
    console.log("Key: ", key);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      encrypted_data: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    };
  }
  catch (err) {
    console.log(err);
  }
}

async function callbackDecrypt(encryptedData: string, iv: string, tag: string) {
  try {
    // Convert Base64 inputs to Buffers
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');

    const key = await authenticationService.getDecryptionKey(5);

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key,"hex"), ivBuffer);

    // Set the authentication tag
    decipher.setAuthTag(tagBuffer);

    // Decrypt the ciphertext
    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);

    // Return plaintext as a string
    return decrypted.toString('utf8');
  } catch (err) {
    // Handle decryption errors (e.g., invalid tag or tampered data)
    throw new Error('Decryption failed: Authentication tag is invalid or data was tampered with.');
  }
}

export { encrypt, decrypt, encryptData, decryptData, callbackEncrypt, callbackDecrypt };
