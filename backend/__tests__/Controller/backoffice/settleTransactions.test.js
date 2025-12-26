import { backofficeService } from "../../../dist/services/index.js";
import backofficecontroller from "../../../dist/controller/backoffice/backoffice.js";
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import CustomError from "../../../dist/utils/custom_error.js";

jest.mock("../../../dist/services/index.js", () => ({
  backofficeService: {
    settleTransactions: jest.fn(),
  },
}));

describe("settleTransactions", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 and success response when transactionIds and settlement are provided", async () => {
    req.body.transactionIds = [1, 2, 3];
    req.body.settlement = true; // Include settlement parameter

    const mockResult = "Transactions Settled";
    backofficeService.settleTransactions.mockResolvedValue(mockResult);

    await backofficecontroller.settleTransactions(req, res);

    expect(backofficeService.settleTransactions).toHaveBeenCalledWith([1, 2, 3], true);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
  });

  it("should throw an error if no transactionIds are provided", async () => {
    req.body.transactionIds = [];
    req.body.settlement = true; // Ensure settlement is included

    await backofficecontroller.settleTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      ApiResponse.error("One id must be given", 500)
    );
  });

  it("should handle unexpected errors and return 500", async () => {
    req.body.transactionIds = [1, 2, 3];
    req.body.settlement = false; // Include settlement parameter

    backofficeService.settleTransactions.mockRejectedValue(new Error("Unexpected Error"));

    await backofficecontroller.settleTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      ApiResponse.error("Unexpected Error", 500)
    );
  });
});
