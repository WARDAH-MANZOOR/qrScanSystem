import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import getDisbursementController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock('../../../../dist/services/paymentGateway/easypaisa.js');

describe('getDisbursement Controller', () => {
    it('should return 200 and the merchant data on successful retrieval', async () => {
        const mockMerchantData = { id: '1', name: 'Merchant' };
        easyPaisaService.getDisbursement.mockResolvedValue(mockMerchantData);

        const req = {
            user: { merchant_id: '1' },
            query: { someQueryParam: 'value' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        await getDisbursementController.getDisbursement(req, res, next);

        expect(easyPaisaService.getDisbursement).toHaveBeenCalledWith('1', req.query);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockMerchantData));
        expect(next).not.toHaveBeenCalled();
    });

    it('should use merchant_id from query if user.merchant_id is not available', async () => {
        const mockMerchantData = { id: '2', name: 'Query Merchant' };
        easyPaisaService.getDisbursement.mockResolvedValue(mockMerchantData);

        const req = {
            user: {}, // No user.merchant_id
            query: { merchant_id: '2', someQueryParam: 'value' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        await getDisbursementController.getDisbursement(req, res, next);

        expect(easyPaisaService.getDisbursement).toHaveBeenCalledWith('2', req.query);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockMerchantData));
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when the service throws an exception', async () => {
        const mockError = new Error('Service error');
        easyPaisaService.getDisbursement.mockRejectedValue(mockError);

        const req = {
            user: { merchant_id: '1' },
            query: { someQueryParam: 'value' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        await getDisbursementController.getDisbursement(req, res, next);

        expect(easyPaisaService.getDisbursement).toHaveBeenCalledWith('1', req.query);
        expect(next).toHaveBeenCalledWith(mockError);
    });
});
