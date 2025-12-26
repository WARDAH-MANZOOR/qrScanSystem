
import { fetchMerchantAndJazzCash } from '../../../../dist/services/paymentGateway/jazzCash.js'; // Adjust the import path

import CustomError from '../../../../dist/utils/custom_error.js';
describe('fetchMerchantAndJazzCash', () => {
    
    let tx;

    beforeEach(() => {
        tx = {
            merchant: {
                findFirst: jest.fn(),
            },
            jazzCashMerchant: {
                findFirst: jest.fn(),
            }
        };
    });

    it('should throw an error if merchant_uid is missing', async () => {
        await expect(fetchMerchantAndJazzCash(tx, null))
            .rejects
            .toThrow(new CustomError("Merchant UID is required", 400));
    });

    it('should throw an error if merchant is not found', async () => {
        const merchant_uid = 'some-uid';
        tx.merchant.findFirst.mockResolvedValue(null); // Simulate no merchant found
        
        await expect(fetchMerchantAndJazzCash(tx, merchant_uid))
            .rejects
            .toThrow(new CustomError("Merchant not found", 404));
    });

    it('should throw an error if jazzCashMerchant is not found', async () => {
        const merchant_uid = 'some-uid';
        const mockMerchant = { uid: merchant_uid, jazzCashMerchantId: 123 };
        tx.merchant.findFirst.mockResolvedValue(mockMerchant); // Simulate merchant found
        tx.jazzCashMerchant.findFirst.mockResolvedValue(null); // Simulate no jazzCashMerchant found

        await expect(fetchMerchantAndJazzCash(tx, merchant_uid))
            .rejects
            .toThrow(new CustomError("JazzCash Merchant not found", 404));
    });

    it('should return merchant and jazzCashMerchant if both are found', async () => {
        const merchant_uid = 'some-uid';
        const mockMerchant = { uid: merchant_uid, jazzCashMerchantId: 123 };
        const mockJazzCashMerchant = { id: 123, name: 'JazzCash Merchant' };

        tx.merchant.findFirst.mockResolvedValue(mockMerchant); // Simulate merchant found
        tx.jazzCashMerchant.findFirst.mockResolvedValue(mockJazzCashMerchant); // Simulate jazzCashMerchant found

        const result = await fetchMerchantAndJazzCash(tx, merchant_uid);
        
        expect(result).toEqual({ merchant: mockMerchant, jazzCashMerchant: mockJazzCashMerchant });
    });
});
