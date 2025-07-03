import dashboardController from "../../../../dist/controller/dashboard/index.js";
import { dashboardService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import CustomError from "../../../../dist/utils/custom_error.js";

import { validationResult } from "express-validator";

jest.mock("../../../../dist/services/index.js");
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
  

describe("Dashboard Controller - merchantDashboardDetails", () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            query: {},
            user: { id: 1 },
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
        validationResult.mockReturnValue({ isEmpty: () => true });
    });

    it("should return 200 and data on success", async () => {
        const mockData = { totalTransactions: 10 };
        dashboardService.merchantDashboardDetails.mockResolvedValue(mockData);

        await dashboardController.merchantDashboardDetails(mockReq, mockRes, mockNext);

        expect(dashboardService.merchantDashboardDetails).toHaveBeenCalledWith(mockReq.query, mockReq.user);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockData));
    });

    it("should return 400 and validation error if validation fails", async () => {
        validationResult.mockReturnValue({
            isEmpty: () => false,
            array: () => [{ msg: "Validation Error" }],
        });

        await dashboardController.merchantDashboardDetails(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Validation Error" }));
    });

    it("should return 400 and error message on service failure", async () => {
        const mockError = new Error("Service Failure");
        dashboardService.merchantDashboardDetails.mockRejectedValue(mockError);

        await dashboardController.merchantDashboardDetails(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error(mockError.message));
    });
});
