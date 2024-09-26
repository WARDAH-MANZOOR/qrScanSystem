import CustomError from "../../utils/custom_error.js";

const initiateJazzCashPayment = async (paymentData: any) => {
  try {
    console.log("Calling JazzCash Payment API");
    const result = true;
    return result;
  } catch (error) {
    throw new CustomError("Payment initiation failed", 500);
  }
};

export default {
  initiateJazzCashPayment,
};
