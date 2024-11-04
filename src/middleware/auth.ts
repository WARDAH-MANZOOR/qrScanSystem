import { Request, Response, NextFunction } from "express";
import { decryptApiKey, encryptApiKey } from "../utils/authentication.js";
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

  // Check if API key is missing
  if (!apiKey) {
    return res.status(401).json({ error: "API key is missing" });
  }

  let encryptedApiKey = encryptApiKey(apiKey);

  try {
    // Retrieve the user associated with the API key from the database
    const user = await prisma.user.findFirst({
      where: {
        apiKey: encryptApiKey(apiKey),
      },
    });
    console.log(user?.apiKey);
    if (!user || !user.apiKey) {
      return res.status(403).json({ error: "Unauthorized: Invalid API key" });
    }

    // Decrypt the API key if stored encrypted in your DB (optional)
    const decryptedApiKey = decryptApiKey(user.apiKey);

    // Check if the decrypted API key matches the provided API key
    if (decryptedApiKey !== apiKey) {
      return res.status(403).json({ error: "Unauthorized: Invalid API key" });
    }

    // Attach user to request for further use
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
