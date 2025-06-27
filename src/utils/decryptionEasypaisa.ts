import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import ApiResponse from "./ApiResponse.js";
import { decryptAESGCM, deriveKeys, generateHMACSignature } from "./dec_with_signing.js";

const decryptionNewFlowEasypaisa: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, timestamp, encrypted_data, iv, tag, signature } = req.body;

    if (!userId || !timestamp || !encrypted_data || !iv || !tag || !signature) {
    res.status(400).json(ApiResponse.error("Missing encryption fields"));
    return
    }

    const masterKey = Buffer.from(process.env.MASTER_SECRET_KEY!, 'utf8');
    const { hmacKey, aesKey } = deriveKeys(masterKey);

    const expectedSignature = generateHMACSignature(userId + timestamp + encrypted_data, hmacKey);
    if (signature !== expectedSignature) {
      res.status(403).json(ApiResponse.error("Invalid signature"));
      return
    }

    const now = Date.now();
    const requestTime = new Date(timestamp).getTime();
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      res.status(408).json(ApiResponse.error("Request expired"));
      return
    }

    const decryptedStr = decryptAESGCM(encrypted_data, aesKey, iv, tag);
    const decryptedPayload = JSON.parse(decryptedStr);

    // Logging decrypted payload for debugging
    console.log("🔍 Decrypted Payload:", decryptedPayload);

    // ✅ Attach decrypted values directly to req.body
    Object.assign(req.body, decryptedPayload);

    next();
  } catch (err) {
    console.error("Decryption or verification failed", err);
    res.status(500).json(ApiResponse.error("Decryption or verification failed"));
    return;
  }

};
export default { decryptionNewFlowEasypaisa }