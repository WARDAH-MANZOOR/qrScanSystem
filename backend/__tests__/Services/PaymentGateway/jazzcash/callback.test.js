import { callbackDecrypt } from "../../../../dist/utils/enc_dec.js";
import jazzCashService from "../../../../dist/services/paymentGateway/jazzCash.js";

jest.mock("../../../../dist/utils/enc_dec.js"); // Mock the callbackDecrypt function

describe("callback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log to verify logs
  });

  it("should return 'success' when decryption is successful", async () => {
    const body = {
      encrypted_data: "mockEncryptedData",
      iv: "mockIV",
      tag: "mockTag",
    };
    const mockDecryptedPayload = { key: "value" };

    callbackDecrypt.mockResolvedValue(mockDecryptedPayload);

    const result = await jazzCashService.callback(body);

    expect(callbackDecrypt).toHaveBeenCalledWith(body.encrypted_data, body.iv, body.tag);
    expect(console.log).toHaveBeenCalledWith("Encrypted Body: ", body);
    expect(console.log).toHaveBeenCalledWith("Callback Body: ", mockDecryptedPayload);
    expect(result).toBe("success");
  });

  it("should return 'error' when decryption fails", async () => {
    const body = {
      encrypted_data: "mockEncryptedData",
      iv: "mockIV",
      tag: "mockTag",
    };

    callbackDecrypt.mockRejectedValue(new Error("Decryption failed"));

    const result = await jazzCashService.callback(body);

    expect(callbackDecrypt).toHaveBeenCalledWith(body.encrypted_data, body.iv, body.tag);
    expect(console.log).toHaveBeenCalledWith("Encrypted Body: ", body);
    expect(result).toBe("error");
  });

  it("should return 'error' when body is undefined", async () => {
    const result = await jazzCashService.callback(undefined);

    expect(callbackDecrypt).not.toHaveBeenCalled(); // Decryption should not be attempted
    expect(console.log).not.toHaveBeenCalledWith("Encrypted Body: "); // Body is undefined, so no log
    expect(result).toBe("error");
  });
});
