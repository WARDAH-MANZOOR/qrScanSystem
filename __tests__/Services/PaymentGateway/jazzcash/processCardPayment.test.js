import axios from "axios";
import { processCardPayment } from "../../../../dist/services/paymentGateway/jazzCash.js";


jest.mock("axios");

describe("processCardPayment", () => {
  const paymentUrl = "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Purchase/PAY";

  it("should return correct redirect details for a successful payment", async () => {
    const sendData = { amount: 1000, currency: "PKR" };
    const redirectUrl = "https://example.com/success";
    const mockResponse = {
      data: {
        pp_ResponseCode: "000",
        pp_TxnRefNo: "123456789",
        pp_TxnDateTime: "2025-01-11T10:00:00",
      },
    };

    axios.post.mockResolvedValue(mockResponse);

    const result = await processCardPayment(sendData, redirectUrl);

    expect(axios.post).toHaveBeenCalledWith(paymentUrl, sendData, {
      headers: { "Content-Type": "application/json" },
    });
    expect(result).toEqual({
      message: "Redirecting to JazzCash...",
      redirect_url: redirectUrl,
      txnNo: "123456789",
      txnDateTime: "2025-01-11T10:00:00",
      statusCode: "000",
    });
  });

  it("should throw an error if the payment fails", async () => {
    const sendData = { amount: 1000, currency: "PKR" };
    const redirectUrl = "https://example.com/success";
    const mockResponse = {
      data: {
        pp_ResponseCode: "001", // Simulate a failed transaction
      },
    };

    axios.post.mockResolvedValue(mockResponse);

    await expect(processCardPayment(sendData, redirectUrl)).rejects.toThrow(
      "JazzCash Card Payment failed"
    );

    expect(axios.post).toHaveBeenCalledWith(paymentUrl, sendData, {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("should throw an error if no response is returned", async () => {
    const sendData = { amount: 1000, currency: "PKR" };
    const redirectUrl = "https://example.com/success";

    axios.post.mockResolvedValue({ data: null });

    await expect(processCardPayment(sendData, redirectUrl)).rejects.toThrow(
      "JazzCash Card Payment failed"
    );

    expect(axios.post).toHaveBeenCalledWith(paymentUrl, sendData, {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("should throw an error if axios throws an error", async () => {
    const sendData = { amount: 1000, currency: "PKR" };
    const redirectUrl = "https://example.com/success";

    axios.post.mockRejectedValue(new Error("Network Error"));

    await expect(processCardPayment(sendData, redirectUrl)).rejects.toThrow(
      "Network Error"
    );

    expect(axios.post).toHaveBeenCalledWith(paymentUrl, sendData, {
      headers: { "Content-Type": "application/json" },
    });
  });
});
