import RSAEncryption from "../../../../dist/utils/RSAEncryption.js";
import  easyPaisaService  from "../../../../dist/services/paymentGateway/easypaisa.js";
jest.mock('../../../../dist/utils/RSAEncryption.js');

describe('createRSAEncryptedPayload', () => {
    const validUrl = "https://example.com";
    const publicKeyPath = "src/keys/publickey.pem";
    const encryptedPayload = "encrypted_data";

    beforeEach(() => {
        jest.clearAllMocks(); // Clear previous mocks
    });

    test('should return encrypted payload when encryption is successful', async () => {
        // Mock RSAEncryption methods
        RSAEncryption.getPublicKey.mockImplementation(() => "mocked_public_key");
        RSAEncryption.encrypt.mockImplementation(() => encryptedPayload);

        const result = await easyPaisaService.createRSAEncryptedPayload(validUrl);

        expect(RSAEncryption.getPublicKey).toHaveBeenCalledWith(publicKeyPath);
        expect(RSAEncryption.encrypt).toHaveBeenCalledWith(validUrl, "mocked_public_key");
        expect(result).toBe(encryptedPayload);
    });

    test('should throw error if public key retrieval fails', async () => {
        // Mock getPublicKey to throw an error
        RSAEncryption.getPublicKey.mockImplementation(() => {
            throw new Error("Public key not found");
        });

        console.error = jest.fn(); // Mock console.error to suppress logs

        const result = await easyPaisaService.createRSAEncryptedPayload(validUrl);

        expect(RSAEncryption.getPublicKey).toHaveBeenCalledWith(publicKeyPath);
        expect(console.error).toHaveBeenCalledWith("Error:", new Error("Public key not found"));
        expect(result).toBeUndefined();
    });

    test('should throw error if encryption fails', async () => {
        // Mock getPublicKey to succeed
        RSAEncryption.getPublicKey.mockImplementation(() => "mocked_public_key");

        // Mock encrypt to throw an error
        RSAEncryption.encrypt.mockImplementation(() => {
            throw new Error("Encryption failed");
        });

        console.error = jest.fn();

        const result = await easyPaisaService.createRSAEncryptedPayload(validUrl);

        expect(RSAEncryption.getPublicKey).toHaveBeenCalledWith(publicKeyPath);
        expect(RSAEncryption.encrypt).toHaveBeenCalledWith(validUrl, "mocked_public_key");
        expect(console.error).toHaveBeenCalledWith("Error:", new Error("Encryption failed"));
        expect(result).toBeUndefined();
    });

    test('should handle empty input URL', async () => {
        const emptyUrl = "";

        RSAEncryption.getPublicKey.mockImplementation(() => "mocked_public_key");
        RSAEncryption.encrypt.mockImplementation(() => encryptedPayload);

        const result = await easyPaisaService.createRSAEncryptedPayload(emptyUrl);

        expect(RSAEncryption.getPublicKey).toHaveBeenCalledWith(publicKeyPath);
        expect(RSAEncryption.encrypt).toHaveBeenCalledWith(emptyUrl, "mocked_public_key");
        expect(result).toBe(encryptedPayload);
    });
   
    
});