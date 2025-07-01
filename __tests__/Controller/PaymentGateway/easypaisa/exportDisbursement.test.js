import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import  exportDisbursementController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock('../../../../dist/services/paymentGateway/easypaisa.js');

describe('exportDisbursement Controller', () => {

    let req, res, next;

    beforeEach(() => {
        req = {
            user: { merchant_id: "merchant123" },
            query: { fromDate: "2024-01-01", toDate: "2024-01-31" }
        };
        res = {
            setHeader: jest.fn(),
            send: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should return CSV data when called successfully with user merchant_id', async () => {
        const mockCSVData = "transaction_id,amount,date\n12345,100,2024-01-01";
        easyPaisaService.exportDisbursement.mockResolvedValue(mockCSVData);

        await exportDisbursementController.exportDisbursement(req, res, next);

        expect(easyPaisaService.exportDisbursement).toHaveBeenCalledWith("merchant123", req.query);
        expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
        expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="transactions.csv"');
        expect(res.send).toHaveBeenCalledWith(mockCSVData);
        expect(next).not.toHaveBeenCalled();
    });

    it('should return CSV data when merchant_id is in query params', async () => {
        req.user = null;
        req.query.merchant_id = "merchant456";

        const mockCSVData = "transaction_id,amount,date\n67890,200,2024-01-02";
        easyPaisaService.exportDisbursement.mockResolvedValue(mockCSVData);

        await exportDisbursementController.exportDisbursement(req, res, next);

        expect(easyPaisaService.exportDisbursement).toHaveBeenCalledWith("merchant456", req.query);
        expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
        expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="transactions.csv"');
        expect(res.send).toHaveBeenCalledWith(mockCSVData);
        expect(next).not.toHaveBeenCalled();
    });


    it('should call next with error if service throws an error', async () => {
        const mockError = new Error("Service failure");
        easyPaisaService.exportDisbursement.mockRejectedValue(mockError);

        await exportDisbursementController.exportDisbursement(req, res, next);

        expect(easyPaisaService.exportDisbursement).toHaveBeenCalledWith("merchant123", req.query);
        expect(next).toHaveBeenCalledWith(mockError);
    });

});
