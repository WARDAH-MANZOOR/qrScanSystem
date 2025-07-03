// import crypto from "crypto";
// const deriveKeys = (masterKey: Buffer) => {
//   const hmacKey = crypto.createHmac('sha256', masterKey).update('HMAC_KEY').digest();
//   const aesKey = crypto.createHmac('sha256', masterKey).update('ENC_KEY').digest().slice(0, 32); // 32 bytes for AES-256
//   return { hmacKey, aesKey };
// }
import crypto from 'crypto';
const deriveKeys = (masterKey) => {
    const hmacKey = crypto.createHmac('sha256', masterKey).update('HMAC_KEY').digest();
    const aesKey = crypto.createHmac('sha256', masterKey).update('ENC_KEY').digest().slice(0, 32); // AES-256
    return { hmacKey, aesKey };
};
const encryptAESGCM = (plaintext, aesKey) => {
    const iv = crypto.randomBytes(12); // Recommended size for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
    };
};
const decryptAESGCM = (encryptedData, aesKey, iv, tag) => {
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedData, 'base64')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
};
const generateHMACSignature = (data, hmacKey) => {
    return crypto.createHmac('sha256', hmacKey).update(data).digest('hex');
};
export { deriveKeys, encryptAESGCM, decryptAESGCM, generateHMACSignature, };
