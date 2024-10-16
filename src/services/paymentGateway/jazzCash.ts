import CustomError from "../../utils/custom_error.js";
import crypto from "crypto";
import { format } from "date-fns";
import axios from "axios";
import { transactionService } from "services/index.js";
import { encrypt } from "utils/enc_dec.js";
import prisma from "prisma/client.js";
import type { IjazzCashConfigParams } from "types/merchant.js";

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

const findTransaction = async (id: string) => {
  let transaction = await prisma.transaction.findUnique({
    where: { transaction_id: id, status: "pending" },
  });
  return Boolean(transaction);
};
const initiateJazzCashPayment = async (
  paymentData: any,
  merchant_uid?: string
) => {
  try {
    const txnDateTime = format(new Date(), "yyyyMMddHHmmss");
    var jazzCashMerchantIntegritySalt = "";
    const jazzCashCredentials = {
      pp_MerchantID: "",
      pp_Password: "",
    };

    if (!paymentData.amount || !paymentData.phone) {
      throw new CustomError("Amount and phone are required", 400);
    }

    // add a redirect_url check
    if (!paymentData.redirect_url) {
      throw new CustomError("Redirect URL is required", 400);
    }

    // type check
    if (!paymentData.type) {
      throw new CustomError("Payment type is required", 400);
    }

    let customWhere = {} as any;
    if (merchant_uid) {
      customWhere = { uid: merchant_uid };

      // find uid from merchant id
      const merchant = await prisma.merchant.findFirst({
        where: {
          ...customWhere,
        },
      });
      console.log(merchant)

      const jazzCashMerchant = await prisma.jazzCashMerchant.findFirst({
        where: {
          //@ts-ignore
          id: merchant.jazzCashMerchantId,
        },
      });

      if (!jazzCashMerchant) {
        throw new CustomError("Payment Merchant not found", 404);
      }

      // update jazzCashCredentials
      jazzCashCredentials.pp_MerchantID = "32641894" 
      // jazzCashMerchant.jazzMerchantId;
      jazzCashCredentials.pp_Password = "c1w993t81e"
      // jazzCashMerchant.password;
      jazzCashMerchantIntegritySalt = "wt25vdy0y8"
      // jazzCashMerchant.integritySalt;

      if (!merchant) {
        throw new CustomError("Merchant not found", 404);
      }
      paymentData.merchantId = merchant.merchant_id;
    }
    const paymentType = paymentData.type?.toUpperCase();

    // Get the fractional milliseconds part of the current timestamp
    const currentTime = Date.now();
    const fractionalMilliseconds = Math.floor(
      (currentTime - Math.floor(currentTime)) * 1000
    );

    let txnRefNo;
    let transactionCreated = false;
    // Create the transaction reference number
    if (paymentData.transaction_id) {
      let transaction = await findTransaction(paymentData.transaction_id);
      if (transaction) {
        txnRefNo = paymentData.transaction_id;
        transactionCreated = true;
      } else {
        throw new CustomError("Transaction with Tranaction ID not found", 404);
      }
    } else {
      txnRefNo = `T${txnDateTime}${fractionalMilliseconds
        .toString()
        .padStart(5, "0")}`;
    }
    const amount = paymentData.amount;
    const phone = paymentData.phone;

    // Prepare the data to send
    const sendData: any = {
      pp_Version: "1.1",
      pp_TxnType: "MWALLET",
      pp_Language: "EN",
      pp_MerchantID: jazzCashCredentials.pp_MerchantID,
      pp_SubMerchantID: "",
      pp_Password: jazzCashCredentials.pp_Password,
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
    sendData.pp_SecureHash = getSecureHash(sendData, jazzCashMerchantIntegritySalt);
    if (paymentType === "CARD") {
      let payload = {
        pp_Version: "2.0",
        pp_IsRegisteredCustomer: "Yes",
        pp_ShouldTokenizeCardNumber: "Yes",
        pp_TxnType: "MPAY",
        pp_TxnRefNo: "T20221125153218",
        pp_Amount: "20000",
        pp_TxnCurrency: "PKR",
        pp_TxnDateTime: "20221125153215",
        pp_TxnExpiryDateTime: "20221202153215",
        pp_BillReference: "billRef",
        pp_Description: "Description of transaction",
        pp_CustomerCardNumber: "5123456789012346",
        pp_UsageMode: "API",
        pp_SecureHash: "",
        ...jazzCashCredentials,
      };

      return payload;
    } else if (paymentType === "WALLET") {
      if (!transactionCreated) {
        await transactionService.createTransaction({
          id: txnRefNo,
          original_amount: amount,
          type: "wallet",
          merchant_id: parseInt(paymentData.merchantId),
        });
      }

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
        bank_id: response.data.pp_BankID,
        bill_ref: response.data.pp_BillReference,
        retrieval_ref: response.data.pp_RetrievalReferenceNo,
        sub_merchant_id:
          response.data.pp_SubMerchantID != undefined
            ? encrypt(response.data.pp_SubMerchantID)
            : "",
        custom_field_1: encrypt(response.data.ppmpf_1),
        custom_field_2:
          response.data.pp_CustomerCardNumber != undefined
            ? encrypt(response.data.pp_CustomerCardNumber)
            : "",
        custom_field_3:
          response.data.pp_CustomerCardCVV != undefined
            ? encrypt(response.data.pp_CustomerCardCVV)
            : "",
        custom_field_4:
          response.data.pp_CustomerCardExpiry != undefined
            ? encrypt(response.data.pp_CustomerCardExpiry)
            : "",
        custom_field_5: response.data.ppmpf_5,
      };
      let provider = {
        name: "JazzCash",
        type: "MWALLET",
        version: "1.1",
      };
      await transactionService.completeTransaction({
        transaction_id: txnRefNo,
        status,
        response_message: response.data.pp_ResponseMessage,
        info,
        provider,
        merchant_id: parseInt(paymentData.merchantId),
      });

      const r = response.data;

      if (!r) {
        throw new CustomError(response.statusText, 500);
      }

      if (r.pp_ResponseCode === "000") {
        return {
          message: "Redirecting to JazzCash...",
          redirect_url: paymentData.redirect_url,
          txnNo: r.pp_TxnRefNo,
          txnDateTime: r.pp_TxnDateTime,
        };
      } else {
        throw new CustomError(
          `The payment failed because: 【${r.pp_ResponseCode} ${r.pp_ResponseMessage}】`,
          400
        );
      }
    }
  } catch (error: any) {
    console.log(error);
    throw new CustomError(error?.error, error?.statusCode);
  }
};

const getJazzCashMerchant = async (params: IjazzCashConfigParams) => {
  try {
    const where: any = {};

    if (params?.merchantId) where["merchantId"] = parseInt(params.merchantId);

    const jazzCashConfig = await prisma.jazzCashMerchant.findMany({
      where,
    });

    if (!jazzCashConfig) {
      throw new CustomError("JazzCash configuration not found", 404);
    }

    return jazzCashConfig;
  } catch (error: any) {
    throw new CustomError(error?.message || "An error occurred", 500);
  }
};

const createJazzCashMerchant = async (merchantData: any) => {
  try {
    const jazzCashConfig = await prisma.$transaction(async (prisma) => {
      const newMerchant = await prisma.jazzCashMerchant.create({
        data: merchantData,
      });
      return newMerchant;
    });

    return jazzCashConfig;
  } catch (error: any) {
    throw new CustomError(error?.message || "An error occurred", 500);
  }
};

const updateJazzCashMerchant = async (merchantId: number, updateData: any) => {
  try {
    const updatedMerchant = await prisma.$transaction(async (prisma) => {
      const merchant = await prisma.jazzCashMerchant.update({
        where: { id: merchantId },
        data: updateData,
      });
      return merchant;
    });

    return updatedMerchant;
  } catch (error: any) {
    throw new CustomError(error?.message || "An error occurred", 500);
  }
};

const deleteJazzCashMerchant = async (merchantId: number) => {
  try {
    const deletedMerchant = await prisma.$transaction(async (prisma) => {
      const merchant = await prisma.jazzCashMerchant.delete({
        where: { id: merchantId },
      });
      return merchant;
    });

    return deletedMerchant;
  } catch (error: any) {
    throw new CustomError(error?.message || "An error occurred", 500);
  }
};

const statusInquiry = async (merchantId: number) => {
  let data = JSON.stringify({
    "pp_TxnRefNo": "T20241016163345",
    "pp_MerchantID": "MC117957",
    "pp_Password": "4gz0s3v24y",
    "pp_SecureHash": "716D784F05981CD34FFCD79EAB4CC36A97E9AE7883564876606AF67BFE6B3E5A"
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://payments.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  };

  axios.request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error);
    });

}

export default {
  initiateJazzCashPayment,
  getJazzCashMerchant,
  createJazzCashMerchant,
  updateJazzCashMerchant,
  deleteJazzCashMerchant,
};
