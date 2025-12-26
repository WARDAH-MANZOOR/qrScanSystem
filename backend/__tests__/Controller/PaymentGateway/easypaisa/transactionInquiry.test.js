import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import transactionInquiryController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock('../../../../dist/services/paymentGateway/easypaisa.js');

describe('transactionInquiry Controller', () => {

    it('should return 200 and the result on successful transaction inquiry', async () => {
        // Mock successful result from service
        const mockTransactionInquiryResult = { transactionId: '12345', status: 'success' };
        easyPaisaService.transactionInquiry.mockResolvedValue(mockTransactionInquiryResult);

        // Mock the req, res, and next objects
        const req = {
            params: { merchantId: '1' },
            body: { transactionId: '12345' }, // Payload example
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await transactionInquiryController.transactionInquiry(req, res, next);

        // Assertions
        expect(easyPaisaService.transactionInquiry).toHaveBeenCalledWith(req.body, '1');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockTransactionInquiryResult));
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when the service throws an exception', async () => {
        // Mock an error from the service
        const mockError = new Error('Failed to perform transaction inquiry');
        easyPaisaService.transactionInquiry.mockRejectedValue(mockError);

        // Mock the req, res, and next objects
        const req = {
            params: { merchantId: '1' },
            body: { transactionId: '12345' }, // Payload example
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await transactionInquiryController.transactionInquiry(req, res, next);

        // Assertions
        expect(easyPaisaService.transactionInquiry).toHaveBeenCalledWith(req.body, '1');
        expect(next).toHaveBeenCalledWith(mockError);
    });
});
