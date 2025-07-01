
import {exportSettlements} from '../../../dist/controller/settlement/index.js';
import { exportSettlement } from '../../../dist/services/settlement/index.js';
import ApiResponse from '../../../dist/utils/ApiResponse.js';
jest.mock('../../../dist/services/settlement/index.js', () => ({
    exportSettlement: jest.fn(),
}));

describe("exportSettlements", () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = {
            query: { start: "2025-01-01T00:00:00+00:00", end: "2025-01-31T23:59:59+00:00" },
            user: { role: "Merchant", merchant_id: 123 },
        };
        res = {
            setHeader: jest.fn(),
            send: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should export settlements and return CSV file", async () => {
        const mockCSVData = "id,merchant_id,amount\n1,123,100\n2,124,150";
        exportSettlement.mockResolvedValue(mockCSVData);

        await exportSettlements(req, res, next);

        expect(exportSettlement).toHaveBeenCalledWith(req.query, req.user);
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="transactions.csv"');
        expect(res.send).toHaveBeenCalledWith(mockCSVData);
    });

    it("should return an error response if exportSettlement throws an error", async () => {
        const mockError = new Error("Unexpected error");
        exportSettlement.mockRejectedValue(mockError);

        await exportSettlements(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error(mockError.message, mockError.statusCode));
    });

    it("should return an error if query parameters are missing", async () => {
        req.query = {}; // No query parameters

        const mockError = new Error("Missing query parameters");
        exportSettlement.mockRejectedValue(mockError);

        await exportSettlements(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error(mockError.message, mockError.statusCode));
    });

    it("should return an error if user is invalid", async () => {
        req.user = null; // Invalid user

        const mockError = new Error("Invalid user");
        exportSettlement.mockRejectedValue(mockError);

        await exportSettlements(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error(mockError.message, mockError.statusCode));
    });
});
