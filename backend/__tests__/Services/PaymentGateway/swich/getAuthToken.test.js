import prisma from "../../../../dist/prisma/client.js";
import axios from "axios";
import qs from "qs";
import { decrypt } from "../../../../dist/utils/enc_dec.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import swichService from "../../../../dist/services/paymentGateway/swich.js"; // Update this path accordingly

jest.mock("axios");
jest.mock("../../../../dist/prisma/client.js", () => ({
    swichMerchant: {
        findUnique: jest.fn(), // Mock the findUnique method
    },
}));
jest.mock("../../../../dist/utils/enc_dec.js");

describe("getAuthToken", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should return access token if Swich Merchant is found and request is successful", async () => {
        const mockSwichMerchant = {
            id: 1,
            clientId: "encryptedClientId",
            clientSecret: "encryptedClientSecret",
        };
        const decryptedClientId = "decryptedClientId";
        const decryptedClientSecret = "decryptedClientSecret";
        const mockResponse = {
            data: {
                access_token: "mockAccessToken",
            },
        };

        prisma.swichMerchant.findUnique.mockResolvedValue(mockSwichMerchant);
        decrypt.mockImplementation((value) =>
            value === mockSwichMerchant.clientId ? decryptedClientId : decryptedClientSecret
        );
        axios.request.mockResolvedValue(mockResponse);

        const result = await swichService.getAuthToken(mockSwichMerchant.id);

        expect(prisma.swichMerchant.findUnique).toHaveBeenCalledWith({
            where: { id: mockSwichMerchant.id },
        });
        expect(decrypt).toHaveBeenCalledWith(mockSwichMerchant.clientId);
        expect(decrypt).toHaveBeenCalledWith(mockSwichMerchant.clientSecret);
        expect(axios.request).toHaveBeenCalledWith({
            method: "post",
            maxBodyLength: Infinity,
            url: "https://auth.swichnow.com/connect/token",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            data: qs.stringify({
                grant_type: "client_credentials",
                client_id: decryptedClientId,
                client_secret: decryptedClientSecret,
            }),
        });
        expect(result).toBe(mockResponse.data.access_token);
    });

    test("should throw CustomError if Swich Merchant is not found", async () => {
        prisma.swichMerchant.findUnique.mockResolvedValue(null);

        await expect(swichService.getAuthToken(1)).rejects.toThrow(
            new CustomError("Swich Merchant Not Found", 400)
        );

        expect(prisma.swichMerchant.findUnique).toHaveBeenCalledWith({
            where: { id: 1 },
        });
    });

    test("should throw CustomError if access token is not present in the response", async () => {
        const mockSwichMerchant = {
            id: 1,
            clientId: "encryptedClientId",
            clientSecret: "encryptedClientSecret",
        };
        const decryptedClientId = "decryptedClientId";
        const decryptedClientSecret = "decryptedClientSecret";
        const mockResponse = { data: {} };

        prisma.swichMerchant.findUnique.mockResolvedValue(mockSwichMerchant);
        decrypt.mockImplementation((value) =>
            value === mockSwichMerchant.clientId ? decryptedClientId : decryptedClientSecret
        );
        axios.request.mockResolvedValue(mockResponse);

        await expect(swichService.getAuthToken(mockSwichMerchant.id)).rejects.toThrow(
            new CustomError("Internal Server Error", 500)
        );

        expect(prisma.swichMerchant.findUnique).toHaveBeenCalledWith({
            where: { id: mockSwichMerchant.id },
        });
        expect(decrypt).toHaveBeenCalledWith(mockSwichMerchant.clientId);
        expect(decrypt).toHaveBeenCalledWith(mockSwichMerchant.clientSecret);
        expect(axios.request).toHaveBeenCalledWith({
            method: "post",
            maxBodyLength: Infinity,
            url: "https://auth.swichnow.com/connect/token",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            data: qs.stringify({
                grant_type: "client_credentials",
                client_id: decryptedClientId,
                client_secret: decryptedClientSecret,
            }),
        });
    });
});
