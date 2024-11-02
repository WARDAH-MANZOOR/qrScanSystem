import { PrismaClient } from "@prisma/client";
import { encryptApiKey, generateApiKey } from "../utils/authentication.js";

const prisma = new PrismaClient();
export const populateEncryptedApiKeysForExistingUsers = async () => {
  // Find all users without an API key
  const usersWithoutApiKey = await prisma.user.findMany({
    // where: { apiKey: null },
  });

  for (const user of usersWithoutApiKey) {
    // Generate a new API key
    const plainApiKey = generateApiKey();

    // Encrypt the API key
    const encryptedApiKey = encryptApiKey(plainApiKey);

    // Update the user with the encrypted API key
    await prisma.user.update({
      where: { id: user.id },
      data: { apiKey: encryptedApiKey },
    });

    console.log(`API key generated and encrypted for user ID: ${user.id}`);
  }

  console.log("Encrypted API keys populated for all existing users.");
};
