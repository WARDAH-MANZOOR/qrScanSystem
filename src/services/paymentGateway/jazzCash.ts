import CustomError from "../../utils/custom_error.js";
import crypto from "crypto";
import { format } from "date-fns";
import axios from "axios";
import { transactionService } from "services/index.js";

const MERCHANT_ID = "12478544";
const PASSWORD = "uczu5269d1";
const RETURN_URL = "https://devtects.com/thankyou.html";
const INTEGRITY_SALT = "e6t384f1fu";

const getSecureHash = (data: any, salt: string): string => {
  const hashArray = [
    data.pp_Amount,
    data.pp_BillReference,
    data.pp_Description,
    data.pp_Language,
    data.pp_MerchantID,
    data.pp_Password,
    data.pp_ReturnURL,
    data.pp_TxnCurrency,
    data.pp_TxnDateTime,
    data.pp_TxnExpiryDateTime,
    data.pp_TxnRefNo,
    data.pp_TxnType,
    data.pp_Version,
    data.ppmpf_1,
  ];

  const sortedData = Object.keys(hashArray)
    .sort()
    .reduce((result: any, key: any) => {
      result[key] = hashArray[key];
      return result;
    }, {});

  // Create the string to hash
  let strToHash = "";
  for (const key in sortedData) {
    const value = sortedData[key];
    if (value) {
      // Only include non-empty values
      strToHash += `&${value}`;
    }
  }

  // Prepend the integrity salt
  strToHash = salt + strToHash;

  // Generate the HMAC SHA256 hash
  const hmac = crypto.createHmac("sha256", salt);
  hmac.update(strToHash);
  const ppSecureHash = hmac.digest("hex");

  return ppSecureHash;
};

const initiateJazzCashPayment = async (paymentData: any) => {
  try {
    const txnDateTime = format(new Date(), "yyyyMMddHHmmss");

    // Get the fractional milliseconds part of the current timestamp
    const currentTime = Date.now();
    const fractionalMilliseconds = Math.floor(
      (currentTime - Math.floor(currentTime)) * 1000
    );

    // Create the transaction reference number
    const txnRefNo = `T${txnDateTime}${fractionalMilliseconds
      .toString()
      .padStart(5, "0")}`;

    const amount = paymentData.amount;
    const phone = paymentData.phone;

    // Prepare the data to send
    const sendData: any = {
      pp_Version: "1.1",
      pp_TxnType: "MWALLET",
      pp_Language: "EN",
      pp_MerchantID: MERCHANT_ID,
      pp_SubMerchantID: "",
      pp_Password: PASSWORD,
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amount * 100,
      pp_DiscountedAmount: "",
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: "billRef",
      pp_Description: "buy",
      pp_TxnExpiryDateTime: format(
        new Date(Date.now() + 60 * 60 * 1000),
        "yyyyMMddHHmmss"
      ), // +1 hour
      pp_ReturnURL: RETURN_URL,
      ppmpf_1: phone,
      ppmpf_2: "",
      ppmpf_3: "",
      ppmpf_4: "",
      ppmpf_5: "",
    };

    // Generate the secure hash
    sendData.pp_SecureHash = getSecureHash(sendData, INTEGRITY_SALT);

    await transactionService.createTransaction({
      id: txnRefNo,
      original_amount: sendData.pp_Amount,
      type: "wallet",
      merchant_id: parseInt(paymentData.merchantId),
    });

    // Send the request to JazzCash
    const paymentUrl =
      "https://payments.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const response = await axios.post(
      paymentUrl,
      new URLSearchParams(sendData).toString(),
      { headers }
    );
    let status = "completed";
    console.log(response.data.status);
    if (response.data.pp_ResponseCode != "000") {
      status = "failed";
    }

    let info = {

    };
    let provider = {
      name: "JazzCash",
      type: "MWALLET",
      version: "1.1"
    }
    await transactionService.completeTransaction({ transaction_id:txnRefNo, status, response_message: response.data.pp_ResponseMessage, info, provider, merchant_id: parseInt(paymentData.merchantId) })

    const r = response.data;

    if (!r) {
      throw new CustomError(response.statusText, 500);
    }

    if (r.pp_ResponseCode === "000") {
      // console.log("🚀 ~ initiateJazzCashPayment ~ r:", r);
      return "Redirecting to thank you page...";
    } else {
      throw new CustomError(
        `The payment failed because: 【${r.pp_ResponseCode} ${r.pp_ResponseMessage}】`,
        400
      );
    }
  } catch (error: any) {
    console.log(error);
    throw new CustomError(error?.error, error?.statusCode);
  }
};

export default {
  initiateJazzCashPayment,
};
