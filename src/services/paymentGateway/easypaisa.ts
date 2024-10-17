import axios from "axios";
import CustomError from "utils/custom_error.js";

const initiateEasyPaisa = async (params: any) => {
  try {
    console.log("🚀 ~ initiateEasyPaisa ~ params:", params);
    console.log(process.env["CREDENTIALS"]);
    let data = JSON.stringify({
      orderId: "abc123",
      storeId: process.env["STORE_ID"],
      transactionAmount: "1.23",
      transactionType: "MA",
      mobileAccountNo: "03363739689",
      emailAddress: "m.owais1045@gmail.com",
    });

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initiate-ma-transaction",
      headers: {
        Credentials: process.env["CREDENTIALS"],
        "Content-Type": "application/json",
      },
      data: data,
    };

    const response: any = await axios.request(config);
    console.log("🚀 ~ initiateEasyPaisa ~ response:", response?.data);
    if (response?.data.responseCode == "0000") {
      return { message: "Success" };
    } else {
      throw new CustomError(
        response?.responseDescription ||
          "An error occurred while initiating the transaction",
        500
      );
    }
  } catch (error) {
    throw new CustomError(
      "An error occurred while initiating the transaction",
      500
    );
  }
};

export default { initiateEasyPaisa };
