import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import { merchantService, easyPaisaDisburse } from "../../../../dist/services/index.js";
import axios from "axios";
import CustomError from "../../../../dist/utils/custom_error.js";

jest.mock("../../../../dist/services/index.js");
jest.mock("axios", () => ({
    post: jest.fn(),
    request: jest.fn(),
}));
describe("accountBalance", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should throw an error if merchant is not found", async () => {
        merchantService.findOne.mockResolvedValue(null);

        await expect(easyPaisaService.accountBalance("invalidMerchantId"))
            .rejects
            .toThrow(new CustomError("Merchant not found", 404));
    });

    it("should throw an error if disbursement account is not assigned", async () => {
        merchantService.findOne.mockResolvedValue({ uid: "merchantId", EasyPaisaDisburseAccountId: null });

        await expect(easyPaisaService.accountBalance("merchantId"))
            .rejects
            .toThrow(new CustomError("Disbursement account not assigned.", 404));
    });

    it("should throw an error if disbursement account is not found", async () => {
        merchantService.findOne.mockResolvedValue({ uid: "merchantId", EasyPaisaDisburseAccountId: "accountId" });
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue(null);

        await expect(easyPaisaService.accountBalance("merchantId"))
            .rejects
            .toThrow(new CustomError("Disbursement account not found", 404));
    });

    it("should throw a generic error if an unexpected error occurs", async () => {
        merchantService.findOne.mockRejectedValue(new Error("Unexpected error"));

        await expect(easyPaisaService.accountBalance("merchantId"))
            .rejects
            .toThrow(new CustomError("Unexpected error", 500));
    });
    it("should return account balance successfully if the request is successful", async () => {
        const mockResponse = { 
            data: { 
                ResponseCode: "0", 
                amount: 100 
            } 
        };
    
        // Mock axios request
        axios.post.mockResolvedValue(mockResponse);
    
        // Mock other necessary functions
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ 
            MSISDN: "12345", 
            clientId: "clientId", 
            clientSecret: "clientSecret", 
            xChannel: "xChannel" 
        });
    
        const result = await easyPaisaService.accountBalance("merchantId");
    
        expect(result).toEqual({ amount: 100 });
    });
    
});
