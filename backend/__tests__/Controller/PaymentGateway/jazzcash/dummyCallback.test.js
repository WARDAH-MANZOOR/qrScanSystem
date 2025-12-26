import jazzCashService from "../../../../dist/services/paymentGateway/jazzCash.js";
import JazzCashController from "../../../../dist/controller/paymentGateway/jazzCash.js";

// Mock the jazzCashService callback function
jest.mock("../../../../dist/services/paymentGateway/jazzCash.js", () => ({
    callback: jest.fn(),
}));

describe("dummyCallback", () => {
    let req, res, next;

    beforeEach(() => {
        // Mock the req, res, and next objects manually
        req = {
            body: {
                someData: "sampleData", // Use actual data structure expected by the callback
            },
        };

        res = {
            status: jest.fn().mockReturnThis(), // Chainable status method
            send: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks(); // Reset all mocks before each test
    });

    it("should return a successful response for a valid callback", async () => {
        const mockResult = { status: "success", data: "mockData" };

        // Mock the callback service to return a valid response
        jazzCashService.callback.mockResolvedValueOnce(mockResult);

        // Call the dummyCallback function
        await JazzCashController.dummyCallback(req, res, next);

        // Assertions
        expect(jazzCashService.callback).toHaveBeenCalledWith(req.body); // Ensure callback is called with request body
        expect(res.status).toHaveBeenCalledWith(200); // Check if status code 200 is returned
        expect(res.send).toHaveBeenCalledWith(mockResult); // Check if the response is sent with mock data
    });

    it("should call next with an error if the callback service fails", async () => {
        const mockError = new Error("Callback service failed");

        // Mock the callback service to reject with an error
        jazzCashService.callback.mockRejectedValueOnce(mockError);

        // Call the dummyCallback function
        await JazzCashController.dummyCallback(req, res, next);

        // Assertions
        expect(jazzCashService.callback).toHaveBeenCalledWith(req.body); // Ensure callback is called with request body
        expect(next).toHaveBeenCalledWith(mockError); // Ensure next is called with the error
    });
});
