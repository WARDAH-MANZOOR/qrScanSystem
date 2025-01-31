import { merchantService } from "../../../../dist/services/index.js";
import jazzcashDisburse from "../../../../dist/services/paymentGateway/jazzcashDisburse.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import fetch from "node-fetch"; // Mocking fetch
import { getToken } from "../../../../dist/services/paymentGateway/index.js";

// Mock fetch
jest.mock('node-fetch', () => jest.fn());

beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, "error").mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, "log").mockImplementation(() => {}); // Suppress console.log
});

afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
});

describe('getToken', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return token when valid merchant is provided', async () => {
        const mockMerchant = { JazzCashDisburseAccountId: 'validAccountId' };
        const mockToken = { access_token: 'mockAccessToken' };

        // Mock services and fetch
        merchantService.findOne = jest.fn().mockResolvedValue(mockMerchant);
        jazzcashDisburse.getDisburseAccount = jest.fn().mockResolvedValue({ data: { tokenKey: 'validTokenKey' } });
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve(mockToken)
        });

        const result = await getToken('validMerchantId');

        expect(result).toEqual(mockToken);
        expect(merchantService.findOne).toHaveBeenCalledWith({ uid: 'validMerchantId' });
        expect(jazzcashDisburse.getDisburseAccount).toHaveBeenCalledWith('validAccountId');
        expect(fetch).toHaveBeenCalledWith(
            'https://gateway.jazzcash.com.pk/token',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Authorization': 'Basic validTokenKey',
                    'Content-Type': 'application/x-www-form-urlencoded',
                }),
            })
        );
    });

    it('should throw an error if merchant is not found', async () => {
        merchantService.findOne = jest.fn().mockResolvedValue(null);  // Merchant not found

        await expect(getToken('invalidMerchantId')).rejects.toThrowError(new CustomError("Merchant not found", 404));
    });

    it('should throw an error if disbursement account is not assigned', async () => {
        const mockMerchant = { JazzCashDisburseAccountId: null };

        merchantService.findOne = jest.fn().mockResolvedValue(mockMerchant);

        await expect(getToken('validMerchantId')).rejects.toThrowError(new CustomError("Disbursement account not assigned.", 404));
    });

    it('should throw an error if disbursement account is not found', async () => {
        const mockMerchant = { JazzCashDisburseAccountId: 'validAccountId' };

        merchantService.findOne = jest.fn().mockResolvedValue(mockMerchant);
        jazzcashDisburse.getDisburseAccount = jest.fn().mockResolvedValue(null);

        await expect(getToken('validMerchantId')).rejects.toThrowError(new CustomError("Disbursement account not found", 404));
    });

    it('should handle fetch error gracefully', async () => {
        const mockMerchant = { JazzCashDisburseAccountId: 'validAccountId' };

        merchantService.findOne = jest.fn().mockResolvedValue(mockMerchant);
        jazzcashDisburse.getDisburseAccount = jest.fn().mockResolvedValue({ data: { tokenKey: 'validTokenKey' } });
        fetch.mockRejectedValueOnce(new Error('Fetch error'));

        // Adjusted to expect a thrown error (not resolved)
        await expect(getToken('validMerchantId')).rejects.toThrowError(new Error('Fetch error'));
        // Optionally test that an error message is logged (if you want to validate that log handling works)
    });
});
