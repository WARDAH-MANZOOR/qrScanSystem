import backofficecontroller from "../../../dist/controller/backoffice/backoffice.js";
import {backofficeService} from "../../../dist/services/index.js";
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import CustomError from "../../../dist/utils/custom_error.js";

jest.mock("../../../dist/services/index.js");
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
  describe("failDisbursementsForTelegram", () => {
    let req, res;

    beforeEach(() => {
        req = { body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it("should return 200 and fail the disbursements successfully", async () => {
        req.body.transactionIds = ["tx789", "tx999"];
        const result = { success: true, failedDisbursements: ["tx789", "tx999"] };

        backofficeService.failDisbursements.mockResolvedValue(result);

        await backofficecontroller.failDisbursementsForTelegram(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(result));
        expect(backofficeService.failDisbursements).toHaveBeenCalledWith(["tx789", "tx999"]);
    });

    it("should return 500 if an unexpected error occurs", async () => {
        req.body.transactionIds = ["tx789", "tx999"];

        backofficeService.failDisbursements.mockRejectedValue(new Error("Internal Server Error"));

        await backofficecontroller.failDisbursementsForTelegram(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error", 500));
    });
});
