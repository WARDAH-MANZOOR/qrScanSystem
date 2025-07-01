import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import  getEasyPaisaMerchantController  from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock("../../../../dist/services/paymentGateway/easypaisa.js");

describe("getEasyPaisaMerchant Controller", () => {
  it("should return merchant data on success", async () => {
    // Simulate success in the service call
    const mockMerchant = { id: "123", name: "Merchant Name" };
    easyPaisaService.getMerchant.mockResolvedValue(mockMerchant);

    // Mock request and response objects
    const mockReq = { params: { merchantId: "123" } };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const mockNext = jest.fn();

    // Call the controller
    await getEasyPaisaMerchantController.getEasyPaisaMerchant(mockReq, mockRes, mockNext);

    // Assert that the controller returned the correct response
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: mockMerchant,
      message: "Operation successful",
      statusCode: 200,
    });
  });
  
  it("should call next() with an error if the service fails", async () => {
    // Simulate service error
    const mockError = new Error("Service failure");
    easyPaisaService.getMerchant.mockRejectedValue(mockError);

    // Mock request, response, and next
    const mockReq = { params: { merchantId: "123" } };
    const mockRes = {};
    const mockNext = jest.fn();

    // Call the controller
    await getEasyPaisaMerchantController.getEasyPaisaMerchant(mockReq, mockRes, mockNext);

    // Assert that next() was called with the error
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
});
