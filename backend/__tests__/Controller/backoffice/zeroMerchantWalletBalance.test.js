import { backofficeService } from "../../../dist/services/index.js"; // Ensure path is correct
import backofficecontroller from "../../../dist/controller/backoffice/backoffice.js"; // Import the function being tested
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import CustomError from "../../../dist/utils/custom_error.js";

jest.mock("../../../dist/services/index.js", () => ({
  backofficeService: {
    zeroMerchantWalletBalance: jest.fn(),
  },
}));

const mockReq = (params = {}) => ({
  params,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe("zeroMerchantWalletBalance", () => {
  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  it("should zero merchant wallet balance and return success response", async () => {
    const merchantId = 123;
    const req = mockReq({ merchantId });
    const res = mockRes();
  
    // Adjusted to match the returned response
    const mockResult = { success: true, message: "Operation successful" };
    backofficeService.zeroMerchantWalletBalance.mockResolvedValue(mockResult);
  
    const expectedResponse = ApiResponse.success(mockResult);
  
    await backofficecontroller.zeroMerchantWalletBalance(req, res);
  
    expect(backofficeService.zeroMerchantWalletBalance).toHaveBeenCalledWith(Number(merchantId));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expectedResponse); // Match expected response structure
  });
  
  

  it("should return 404 error if merchantId is not provided", async () => {
    const req = mockReq(); // No merchantId in params
    const res = mockRes();

    await backofficecontroller.zeroMerchantWalletBalance(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(ApiResponse.error("Merchant Id must be given", 404));
  });

  it("should return an error if service throws a CustomError", async () => {
    const merchantId = 123;
    const req = mockReq({ merchantId });
    const res = mockRes();

    const mockError = new CustomError("Service error", 400);
    backofficeService.zeroMerchantWalletBalance.mockRejectedValue(mockError);

    await backofficecontroller.zeroMerchantWalletBalance(req, res);

    expect(backofficeService.zeroMerchantWalletBalance).toHaveBeenCalledWith(Number(merchantId));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(ApiResponse.error("Service error", 400));
  });

  it("should return 500 if an unexpected error occurs", async () => {
    const merchantId = 123;
    const req = mockReq({ merchantId });
    const res = mockRes();

    backofficeService.zeroMerchantWalletBalance.mockRejectedValue(new Error("Unexpected error"));

    await backofficecontroller.zeroMerchantWalletBalance(req, res);

    expect(backofficeService.zeroMerchantWalletBalance).toHaveBeenCalledWith(Number(merchantId));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(ApiResponse.error("Unexpected error", 500));
  });
});
