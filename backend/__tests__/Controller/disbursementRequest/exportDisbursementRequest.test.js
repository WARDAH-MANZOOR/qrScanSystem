import { validationResult } from "express-validator";
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import disbursementRequestService from "../../../dist/services/disbursementRequest/index.js";
import disbursementRequestController from "../../../dist/controller/disbursementRequest/index.js"

jest.mock("../../../dist/services/disbursementRequest/index.js");

jest.mock('express-validator', () => ({
    body: jest.fn().mockReturnValue({
      isEmail: jest.fn().mockReturnThis(),    // Mock isEmail
      withMessage: jest.fn().mockReturnThis(), // Mock withMessage
      notEmpty: jest.fn().mockReturnThis(),    // Mock notEmpty
      normalizeEmail: jest.fn().mockReturnThis(), // Mock normalizeEmail
      isLength: jest.fn().mockReturnThis(),    // Mock isLength
    }),
    validationResult: jest.fn().mockReturnValue({
      isEmpty: jest.fn().mockReturnValue(true),  // Default to no validation errors
      array: jest.fn().mockReturnValue([]),     // Empty error array
    }),
  }));
  describe("exportDisbursementRequest", () => {
    let req, res, next;

    beforeEach(() => {
        req = { query: {}, user: {} };
        res = { setHeader: jest.fn(), send: jest.fn() };
        next = jest.fn();
    });

    it("should set headers and send CSV content", async () => {
        req.query = { merchant_id: "merchant123" };
        req.user.merchant_id = "merchant123";
        const mockCSV = "id,amount\n1,1000";
        disbursementRequestService.exportDisbursementRequest.mockResolvedValue(mockCSV);

        await disbursementRequestController.exportDisbursementRequest(req, res, next);

        expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
        expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", "attachment; filename=\"transactions.csv\"");
        expect(res.send).toHaveBeenCalledWith(mockCSV);
    });

    it("should call next with error on failure", async () => {
        const error = new Error("Export failed");
        disbursementRequestService.exportDisbursementRequest.mockRejectedValue(error);

        await disbursementRequestController.exportDisbursementRequest(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});
