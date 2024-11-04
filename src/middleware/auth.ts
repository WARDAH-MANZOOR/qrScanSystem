import { Request, Response, NextFunction } from "express";
import {
  decryptApiKey,
  encryptApiKey,
  verifyHashedKey,
} from "../utils/authentication.js";
import prisma from "prisma/client.js";
import dotenv from "dotenv";
dotenv.config();

export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract the API key from headers
  const apiKey = req.headers["x-api-key"] as string;
  const { merchantId } = req.params;

  if (!merchantId) {
    return res.status(400).json({ error: "Merchant ID is required" });
  }

  // Check if API key is missing
  if (!apiKey) {
    return res.status(401).json({ error: "API key is missing" });
  }

  try {
    // Retrieve the user associated with the API key from the database
    const merchant = await prisma.merchant.findFirst({
      where: {
        uid: merchantId,
      },
    });

    if (!merchant) {
      return res.status(403).json({ error: "Unauthorized: Invalid API key" });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: merchant.user_id,
      },
    });

    if (!user) {
      return res.status(403).json({ error: "Unauthorized: Invalid API key" });
    }

    const hashedKey = user.apiKey;

    if (!hashedKey) {
      return res.status(403).json({ error: "Unauthorized: Invalid API key" });
    }

    const verify = verifyHashedKey(apiKey, hashedKey);
    if (!verify) {
      return res.status(403).json({ error: "Unauthorized: Invalid API key" });
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
