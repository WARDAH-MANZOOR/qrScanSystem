import { ipnService } from "../../../dist/services/index.js";
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import ipnController from "../../../dist/controller/ipn/index.js";

jest.mock("../../../dist/services/index.js");

describe("handleIPN", () => {
    let req, res;

    beforeEach(() => {
        req = { body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it("should return 200 and process IPN successfully", async () => {
        req.body = { transactionId: "txn123", amount: 1000 };
        const responseData = { success: true, message: "IPN processed" };
        ipnService.processIPN.mockResolvedValue(responseData);

        await ipnController.handleIPN(req, res);

        expect(res.json).toHaveBeenCalledWith(responseData);
        expect(ipnService.processIPN).toHaveBeenCalledWith(req.body);
    });

    it("should return 500 if an unexpected error occurs", async () => {
        req.body = { transactionId: "txn123", amount: 1000 };
        ipnService.processIPN.mockRejectedValue(new Error("Internal Server Error"));

        await ipnController.handleIPN(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error", 500));
    });
});
