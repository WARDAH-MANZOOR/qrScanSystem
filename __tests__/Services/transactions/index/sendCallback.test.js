import axios from "axios";
import transactionsService from "../../../../dist/services/transactions/index.js";
import { callbackEncrypt } from "../../../../dist/utils/enc_dec.js";

jest.mock("axios", () => ({
    request: jest.fn(),
}));

jest.mock("../../../../dist/utils/enc_dec.js", () => ({
    callbackEncrypt: jest.fn(),
}));

describe('sendCallback', () => {
    const mockWebhookUrl = 'https://mockwebhookurl.com';
    const mockPayload = {
        original_amount: 100,
        date_time: '2025-01-12T12:00:00',
        merchant_transaction_id: '12345',
        merchant_id: '6789',
    };
    const mockMsisdn = '9876543210';
    const mockType = 'payment';

    beforeEach(() => {
        global.console.log = jest.fn(); // Mock console.log to track logs
        jest.useFakeTimers(); // Mock setTimeout
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    it('should send a callback successfully', async () => {
        axios.request.mockResolvedValue({ data: 'success' });

        transactionsService.sendCallback(mockWebhookUrl, mockPayload, mockMsisdn, mockType, false, false);

        jest.runAllTimers(); // Fast-forward timers

        await Promise.resolve(); // Ensure all promises in the timeout have resolved

        expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
            method: 'post',
            url: mockWebhookUrl,
            data: JSON.stringify({
                amount: mockPayload.original_amount,
                msisdn: mockMsisdn,
                time: mockPayload.date_time,
                order_id: mockPayload.merchant_transaction_id,
                status: 'success',
                type: mockType,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
            maxBodyLength: Infinity,
        }));

        expect(console.log).toHaveBeenCalledWith('Callback Payload: ', mockPayload);
        expect(console.log).toHaveBeenCalledWith('Callback sent successfully');
    });

    it('should log an error if the callback response is not success', async () => {
        axios.request.mockResolvedValue({ data: 'failure' });

        transactionsService.sendCallback(mockWebhookUrl, mockPayload, mockMsisdn, mockType, false, false);

        jest.runAllTimers(); // Fast-forward timers

        await Promise.resolve(); // Ensure all promises in the timeout have resolved

        expect(console.log).toHaveBeenCalledWith('Callback Payload: ', mockPayload);
        expect(console.log).toHaveBeenCalledWith('Error sending callback');
    });

    
    it('should encrypt the data when doEncryption is true', async () => {
        callbackEncrypt.mockResolvedValue({ encryptedData: 'mockEncryptedData' });

        transactionsService.sendCallback(mockWebhookUrl, mockPayload, mockMsisdn, mockType, true, false);

        jest.runAllTimers(); // Fast-forward timers

        await Promise.resolve(); // Ensure all promises are resolved

        expect(callbackEncrypt).toHaveBeenCalledWith(
            JSON.stringify({
                amount: mockPayload.original_amount,
                msisdn: mockMsisdn,
                time: mockPayload.date_time,
                order_id: mockPayload.merchant_transaction_id,
                status: 'success',
                type: mockType,
            }),
            mockPayload.merchant_id
        );

        expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
            data: JSON.stringify({ encryptedData: 'mockEncryptedData' }),
            headers: {
                'Content-Type': 'application/json',
            },
            maxBodyLength: Infinity,
        }));
    });

    it('should call the callback after a 10-second timeout', () => {
        jest.spyOn(global, 'setTimeout');
        transactionsService.sendCallback(mockWebhookUrl, mockPayload, mockMsisdn, mockType, false, false);

        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);
        global.setTimeout.mockRestore(); // Restore original implementation
    });
});
