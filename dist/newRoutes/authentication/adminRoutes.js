import { Router } from "express";
import { isLoggedIn, isAdmin } from "../../utils/middleware.js";
import { populateEncryptedApiKeysForExistingUsers, populateEncryptedDecryptionKeysForExistingUsers, } from "../../scripts/populateEncryptedApiKeys.js";
const adminRoutes = Router();
adminRoutes.post("/populate_encrypted_api_keys", [isLoggedIn, isAdmin], async (req, res) => {
    try {
        await populateEncryptedApiKeysForExistingUsers();
        res.status(200).json({
            message: "Encrypted API keys populated for all existing users.",
        });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: error?.message || "Internal server error" });
    }
});
adminRoutes.post("/populate_encrypted_decryption_keys", [isLoggedIn, isAdmin], async (req, res) => {
    try {
        await populateEncryptedDecryptionKeysForExistingUsers();
        res.status(200).json({
            message: "Encrypted Decryption keys populated for all existing users.",
        });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: error?.message || "Internal server error" });
    }
});
export default adminRoutes;
