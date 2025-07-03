import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { prepareJazzCashPayload } from '../../../../dist/services/paymentGateway/jazzCash.js';
import { transactionService } from '../../../../dist/services/index.js';
import crypto from 'crypto';

// Redefine getSecureHash function for testing purposes
const getSecureHash = (data, salt) => {
    const hashArray = [
        data.pp_Amount,
        data.pp_BillReference,
        data.pp_Description,
        data.pp_Language,
        data.pp_MerchantID,
        data.pp_Password,
        data.pp_ReturnURL,
        data.pp_TxnCurrency,
        data.pp_TxnDateTime,
        data.pp_TxnExpiryDateTime,
        data.pp_TxnRefNo,
        data.pp_TxnType,
        data.pp_Version,
        data.ppmpf_1,
    ];
    const sortedData = Object.keys(hashArray)
        .sort()
        .reduce((result, key) => {
            result[key] = hashArray[key];
            return result;
        }, {});
    let strToHash = "";
    for (const key in sortedData) {
        const value = sortedData[key];
        if (value) {
            strToHash += `&${value}`;
        }
    }
    strToHash = salt + strToHash;
    const hmac = crypto.createHmac("sha256", salt);
    hmac.update(strToHash);
    return hmac.digest("hex");
};

jest.mock('../../../../dist/services/index.js', () => ({
    transactionService: {
        convertPhoneNumber: jest.fn(),
    },
}));

describe('prepareJazzCashPayload', () => {
    const paymentData = {
        amount: 100,
        phone: '03022082257',
    };
    const credentials = {
        pp_MerchantID: 'merchant123',
        pp_Password: 'password123',
        pp_ReturnURL: 'https://example.com',
    };
    const integritySalt = 'testSalt';
    const txnDateTime = '20250114000000';
    const refNo = 'txn123';

    beforeEach(() => {
        jest.clearAllMocks();
        transactionService.convertPhoneNumber.mockReturnValue('923022082257');
    });

    it('should generate a valid payload with correct expiry date and secure hash', () => {
        const dateSpy = jest.spyOn(global.Date, 'now').mockImplementation(() => new Date('2025-01-14T12:00:00Z').getTime());

        const result = prepareJazzCashPayload(paymentData, credentials, integritySalt, txnDateTime, refNo);

        const expectedExpiryDate = format(
            toZonedTime(new Date('2025-01-14T13:00:00Z'), 'Asia/Karachi'),
            'yyyyMMddHHmmss',
            { timeZone: 'Asia/Karachi' }
        );

        const expectedPayload = {
            pp_Version: '1.1',
            pp_TxnType: 'MWALLET',
            pp_Language: 'EN',
            pp_MerchantID: credentials.pp_MerchantID,
            pp_Password: credentials.pp_Password,
            pp_TxnRefNo: refNo,
            pp_Amount: paymentData.amount * 100,
            pp_TxnCurrency: 'PKR',
            pp_TxnDateTime: txnDateTime,
            pp_TxnExpiryDateTime: expectedExpiryDate,
            pp_ReturnURL: credentials.pp_ReturnURL,
            pp_BillReference: 'billRef',
            pp_Description: 'buy',
            ppmpf_1: '923022082257',
            pp_SecureHash: '09e843ec069ba322c9e8c56c1ea959455f723a1478ba39b6f8dd94d0c78af00e', // Update this based on the hash
        };

        expect(result).toEqual(expectedPayload);
        expect(transactionService.convertPhoneNumber).toHaveBeenCalledWith('03022082257');

        dateSpy.mockRestore();
    });

    it('should calculate the expiry date based on the current time + 1 hour in the correct timezone', () => {
        const dateSpy = jest.spyOn(global.Date, 'now').mockImplementation(() => new Date('2025-01-14T12:00:00Z').getTime());
        const result = prepareJazzCashPayload(paymentData, credentials, integritySalt, txnDateTime, refNo);

        const zonedDate = toZonedTime(new Date('2025-01-14T13:00:00Z'), 'Asia/Karachi');
        const expectedExpiryDate = format(zonedDate, 'yyyyMMddHHmmss', { timeZone: 'Asia/Karachi' });

        expect(result.pp_TxnExpiryDateTime).toBe(expectedExpiryDate);

        dateSpy.mockRestore();
    });

    it('should handle invalid phone number', () => {
        transactionService.convertPhoneNumber.mockImplementation(() => {
            throw new Error('Invalid phone number format');
        });

        expect(() => {
            prepareJazzCashPayload({ ...paymentData, phone: 'invalidPhone' }, credentials, integritySalt, txnDateTime, refNo);
        }).toThrow('Invalid phone number format');
    });

    it('should throw an error if any required field is missing', () => {
        expect(() => prepareJazzCashPayload(null, credentials, integritySalt, txnDateTime, refNo)).toThrow();
        expect(() => prepareJazzCashPayload(paymentData, null, integritySalt, txnDateTime, refNo)).toThrow();
        expect(() => prepareJazzCashPayload(paymentData, credentials, null, txnDateTime, refNo)).toThrow();
    });

    
});
