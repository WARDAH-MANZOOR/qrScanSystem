import authenticationController from "../../../../dist/controller/authentication/index.js";
import { authenticationService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import CustomError from "../../../../dist/utils/custom_error.js"; 

jest.mock("../../../../dist/services/index.js", () => ({
    authenticationService: {
        createDecryptionKey: jest.fn(),
    },
}));

describe("Create Decryption Key", () => {
    let req, res, next;

    beforeEach(() => {
        req = { params: { id: 1 } };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };  // Use json instead of send
        next = jest.fn();
    });

    it("should return 400 if the user id is invalid", async () => {
        req.params.id = "invalid"; // Invalid user id

        await authenticationController.createDecryptionKey(req, res, next);

        // Check if next() is called with the expected error
        expect(next).toHaveBeenCalledWith(new CustomError("Invalid user id", 400));

        // Ensure that res.status and res.json are not called since the error should be passed to next
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    it("should return a new decryption key for valid user id", async () => {
        const mockDecryptionKey = { decryptionKey: "dufbdgi85vjfdklhst4" };
        authenticationService.createDecryptionKey.mockResolvedValue(mockDecryptionKey);

        await authenticationController.createDecryptionKey(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockDecryptionKey));
    });

    it("should handle errors and pass them to the next middleware", async () => {
        authenticationService.createDecryptionKey.mockRejectedValue(new Error("Error creating decryption key"));

        await authenticationController.createDecryptionKey(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
