import CustomError from "../../utils/custom_error.js";
import crypto from "crypto";
import { format } from "date-fns";
import axios from "axios";
import { transactionService } from "services/index.js";
import { encrypt } from "utils/enc_dec.js";
import prisma from "prisma/client.js";
import type { IjazzCashConfigParams } from "types/merchant.js";
import { addWeekdays } from "utils/date_method.js";
import { PROVIDERS } from "constants/providers.js";

// const MERCHANT_ID = "12478544";
// const PASSWORD = "uczu5269d1";
// const RETURN_URL = "https://devtects.com/thankyou.html";
// const INTEGRITY_SALT = "e6t384f1fu";

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
    var JAZZ_CASH_MERCHANT_ID: any = null;
    const txnDateTime = format(new Date(), "yyyyMMddHHmmss");
    let jazzCashMerchantIntegritySalt = "";
    const jazzCashCredentials = {
      pp_MerchantID: "",
      pp_Password: "",
      pp_ReturnURL: "",
    };

    // Input Validation
    if (!paymentData.amount || !paymentData.phone) {
      throw new CustomError("Amount and phone are required", 400);
    }

    if (!paymentData.redirect_url) {
      throw new CustomError("Redirect URL is required", 400);
    }

    if (!paymentData.type) {
      throw new CustomError("Payment type is required", 400);
    }

    const paymentType = paymentData.type?.toUpperCase();

    // Generate Transaction Reference Number
    const currentTime = Date.now();
    const fractionalMilliseconds = Math.floor(
      (currentTime - Math.floor(currentTime)) * 1000
    );
    let txnRefNo: string;
    let transactionCreated = false;

    // Start Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Fetch Merchant and JazzCashMerchant within transaction
      let merchant;
      if (merchant_uid) {
        merchant = await tx.merchant.findFirst({
          where: {
            uid: merchant_uid,
          },
          include: {
            commissions: true,
          },
        });

        if (!merchant) {
          throw new CustomError("Merchant not found", 404);
        }

        const jazzCashMerchant = await tx.jazzCashMerchant.findFirst({
          where: {
            id: merchant.jazzCashMerchantId as number,
          },
        });

        if (!jazzCashMerchant) {
          throw new CustomError("Payment Merchant not found", 404);
        }

        // Update JazzCash Credentials
        jazzCashCredentials.pp_MerchantID = jazzCashMerchant.jazzMerchantId;
        jazzCashCredentials.pp_Password = jazzCashMerchant.password;
        jazzCashMerchantIntegritySalt = jazzCashMerchant.integritySalt;
        jazzCashCredentials.pp_ReturnURL = jazzCashMerchant.returnUrl;
        JAZZ_CASH_MERCHANT_ID = jazzCashMerchant.id;

        paymentData.merchantId = merchant.merchant_id;
      } else {
        throw new CustomError("Merchant UID is required", 400);
      }

      let data:{transaction_id: string} = {transaction_id: ""};

      // Transaction Reference Number
      if (paymentData.transaction_id) {
        const transactionExists = await tx.transaction.findUnique({
          where: {
            transaction_id: paymentData.transaction_id,
            status: "pending",
          },
        });
        if (transactionExists) {
          txnRefNo = paymentData.transaction_id;
          transactionCreated = true;
        } else {
          throw new CustomError(
            "Transaction with Transaction ID not found",
            404
          );
        }
      } else {
        txnRefNo = `T${txnDateTime}${fractionalMilliseconds
          .toString()
          .padStart(5, "0")}`;

        if(paymentData.order_id) {
          data["transaction_id"] = paymentData.order_id;
        }
        else {
          data["transaction_id"] = txnRefNo;
        }
        // Create Transaction within the transaction
        await tx.transaction.create({
          data: {
            ...data,
            date_time: new Date(),
            original_amount: paymentData.amount,
            type: paymentData.type.toLowerCase(),
            status: "pending",
            merchant_id: merchant.merchant_id,
            settled_amount: parseFloat(paymentData.amount) * ((1 - (+merchant.commissions[0].commissionRate + +merchant.commissions[0].commissionGST + +merchant.commissions[0].commissionWithHoldingTax)) as unknown as number),
            providerDetails: {
              id: JAZZ_CASH_MERCHANT_ID,
              name: PROVIDERS.JAZZ_CASH,
            },
          },
        });
        transactionCreated = true;
      }

      // Return necessary data for further processing
      return {
        merchant,
        integritySalt: jazzCashMerchantIntegritySalt,
        refNo: data["transaction_id"],
      };
    },{
      maxWait: 5000,
      timeout: 20000
    }); // End of Prisma Transaction

    // Prepare Data for JazzCash
    const { merchant, integritySalt, refNo } = result;
    jazzCashMerchantIntegritySalt = integritySalt;
    const amount = paymentData.amount;
    const phone = paymentData.phone;

    const date = format(
      new Date(Date.now() + 60 * 60 * 1000),
      "yyyyMMddHHmmss"
    );
    const sendData: any = {
      pp_Version: "1.1",
      pp_TxnType: "MWALLET",
      pp_Language: "EN",
      pp_MerchantID: jazzCashCredentials.pp_MerchantID,
      pp_SubMerchantID: "",
      pp_Password: jazzCashCredentials.pp_Password,
      pp_TxnRefNo: refNo,
      pp_Amount: amount * 100,
      pp_DiscountedAmount: "",
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: "billRef",
      pp_Description: "buy",
      pp_TxnExpiryDateTime: date, // +1 hour
      pp_ReturnURL: jazzCashCredentials.pp_ReturnURL,
      ppmpf_1: phone,
      ppmpf_2: "",
      ppmpf_3: "",
      ppmpf_4: "",
      ppmpf_5: "",
    };
    // Generate the secure hash
    sendData.pp_SecureHash = getSecureHash(
      sendData,
      jazzCashMerchantIntegritySalt
    );

    if (paymentType === "CARD") {
      // Handle CARD payment type
      const payload = {
        pp_Version: "2.0",
        pp_IsRegisteredCustomer: "Yes",
        pp_ShouldTokenizeCardNumber: "Yes",
        pp_TxnType: "MPAY",
        pp_TxnRefNo: refNo,
        pp_Amount: amount * 100,
        pp_TxnCurrency: "PKR",
        pp_TxnDateTime: txnDateTime,
        pp_TxnExpiryDateTime: format(
          new Date(Date.now() + 60 * 60 * 1000),
          "yyyyMMddHHmmss"
        ),
        pp_BillReference: "billRef",
        pp_Description: "Description of transaction",
        pp_CustomerCardNumber: "5123456789012346",
        pp_UsageMode: "API",
        pp_SecureHash: sendData.pp_SecureHash,
        ...jazzCashCredentials,
      };

      // You can process CARD payments similarly
      jazzCashCardPayment({
        refNo: refNo,
        secureHash: sendData.pp_SecureHash,
        amount: amount,
        txnDateTime: txnDateTime,
        jazzCashMerchantIntegritySalt: jazzCashMerchantIntegritySalt,
        ...jazzCashCredentials,
      });
    } else if (paymentType === "WALLET") {
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

      const r = response.data;
      console.log(r);
      if (!r) {
        throw new CustomError(response.statusText, 500);
      }

      let status = "completed";
      if (r.pp_ResponseCode !== "000") {
        status = "failed";
      }

      // Update Transaction after receiving response
      await prisma.$transaction(async (tx) => {
        if (
          status != "completed" &&
          status != "pending" &&
          status != "failed"
        ) {
          return;
        }
        // Update transaction status
        let transaction = await tx.transaction.update({
          where: {
            transaction_id: refNo,
          },
          data: {
            status,
            response_message: r.pp_ResponseMessage,
            // Update other necessary fields
          },
        });

        // Create AdditionalInfo record
        await tx.additionalInfo.create({
          data: {
            bank_id: r.pp_BankID,
            bill_reference: r.pp_BillReference,
            retrieval_ref: r.pp_RetrievalReferenceNo,
            sub_merchant_id: r.pp_SubMerchantID
              ? encrypt(r.pp_SubMerchantID)
              : "",
            custom_field_1: encrypt(r.ppmpf_1),
            // Add other fields as necessary
            transaction: {
              connect: { transaction_id: refNo },
            },
          },
        });

        // Update Provider info if necessary
        const provider = await tx.provider.upsert({
          where: {
            name_txn_type_version: {
              name: "JazzCash",
              txn_type: "MWALLET",
              version: "1.1",
            },
          },
          update: {},
          create: {
            name: "JazzCash",
            txn_type: "MWALLET",
            version: "1.1",
          },
        });

        // Update transaction with providerId
        await tx.transaction.update({
          where: {
            transaction_id: refNo,
          },
          data: {
            providerId: provider.id,
          },
        });
        if (status == "completed") {
          const scheduledAt = addWeekdays(
            new Date(),
            merchant.commissions[0].settlementDuration as number
          ); // Call the function to get the next 2 weekdays
          let scheduledTask = await tx.scheduledTask.create({
            data: {
              transactionId: refNo,
              status: "pending",
              scheduledAt: scheduledAt, // Assign the calculated weekday date
              executedAt: null, // Assume executedAt is null when scheduling
            },
          });
          transactionService.sendCallback(
            merchant?.webhook_url as string,
            transaction,
            phone,
            "payin"
          );
        }
      });
      // End of transaction

      console.log(r.pp_ResponseCode);
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
    // console.error(error);
    throw new CustomError(
      error?.message || "An error occurred",
      error?.statusCode || 500
    );
  }
};

const jazzCashCardPayment = async (obj: any) => {
  let payload: any = {
    pp_Version: "1.1",
    pp_TxnType: "MPAY",
    pp_TxnRefNo: obj.refNo,
    pp_MerchantID: obj.pp_MerchantID,
    pp_Password: obj.pp_Password,
    pp_Amount: obj.amount * 100,
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: obj.txnDateTime,
    pp_TxnExpiryDateTime: format(
      new Date(Date.now() + 60 * 60 * 1000),
      "yyyyMMddHHmmss"
    ),
    pp_BillReference: "billRef",
    pp_Description: "Description of transaction",
    pp_CustomerCardNumber: "5160670239008941",
    pp_UsageMode: "API",
    // pp_IsRegisteredCustomer: "Yes",
    // pp_ShouldTokenizeCardNumber: "Yes",
    // pp_CustomerCardExpiry: "0139",
    // pp_CustomerCardNumberCvv: "100",
  };

  payload.pp_SecureHash = getSecureHash(
    payload,
    obj.jazzCashMerchantIntegritySalt
  );

  const paymentUrl =
    "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Purchase/InitiateAuthentication";
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  console.log("Payload: ", payload);

  const response = await axios.post(paymentUrl, payload);

  const r = response.data;
  console.log(r);
  // if (!r) {
  //   throw new CustomError(response.statusText, 500);
  // }

  // let status = "completed";
  // if (r.pp_ResponseCode !== "000") {
  //   status = "failed";
  // }

  // // Update Transaction after receiving response
  // await prisma.$transaction(async (tx) => {
  //   if (status != "completed" && status != "pending" && status != "failed") {
  //     return;
  //   }
  //   // Update transaction status
  //   let transaction = await tx.transaction.update({
  //     where: {
  //       transaction_id: obj.refNo,
  //     },
  //     data: {
  //       status,
  //       response_message: r.pp_ResponseMessage,
  //       // Update other necessary fields
  //     },
  //   });

  //   // Create AdditionalInfo record
  //   await tx.additionalInfo.create({
  //     data: {
  //       bank_id: r.pp_BankID,
  //       bill_reference: r.pp_BillReference,
  //       retrieval_ref: r.pp_RetrievalReferenceNo,
  //       sub_merchant_id: r.pp_SubMerchantID ? encrypt(r.pp_SubMerchantID) : "",
  //       custom_field_1: encrypt(r.ppmpf_1),
  //       // Add other fields as necessary
  //       transaction: {
  //         connect: { transaction_id: obj.refNo },
  //       },
  //     },
  //   });

  //   // Update Provider info if necessary
  //   const provider = await tx.provider.upsert({
  //     where: {
  //       name_txn_type_version: {
  //         name: "JazzCash",
  //         txn_type: "MPAY",
  //         version: "2.0",
  //       },
  //     },
  //     update: {},
  //     create: {
  //       name: "JazzCash",
  //       txn_type: "MPAY",
  //       version: "2.0",
  //     },
  //   });

  //   // Update transaction with providerId
  //   await tx.transaction.update({
  //     where: {
  //       transaction_id: obj.refNo,
  //     },
  //     data: {
  //       providerId: provider.id,
  //     },
  //   });
  // });

  // console.log(r.pp_ResponseCode);
  // if (r.pp_ResponseCode === "000") {
  //   return {
  //     message: "Payment successful",
  //     txnNo: r.pp_TxnRefNo,
  //     txnDateTime: r.pp_TxnDateTime,
  //   };
  // } else {
  //   throw new CustomError(
  //     `The payment failed because: 【${r.pp_ResponseCode} ${r.pp_ResponseMessage}】`,
  //     400
  //   );
  // }
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

const statusInquiry = async (payload: any, merchantId: string) => {
  let merchant = await prisma.merchant.findFirst({
    where: { uid: merchantId },
    include: {
      jazzCashMerchant: true,
    },
  });
  let sendData = {
    pp_TxnRefNo: payload.transactionId,
    pp_MerchantID: merchant?.jazzCashMerchant?.jazzMerchantId,
    pp_Password: merchant?.jazzCashMerchant?.password,
    pp_SecureHash: "",
  };

  sendData.pp_SecureHash = getSecureHash(
    sendData,
    merchant?.jazzCashMerchant?.integritySalt as string
  );
  let data = JSON.stringify(sendData);

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://payments.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire",
    headers: {
      "Content-Type": "application/json",
    },
    data: data,
  };

  let res = await axios.request(config);
  if (res.data.pp_ResponseCode == "000") {
    return res.data;
  } else {
    throw new CustomError("Internal Server Error", 500);
  }
};

export default {
  initiateJazzCashPayment,
  getJazzCashMerchant,
  createJazzCashMerchant,
  updateJazzCashMerchant,
  deleteJazzCashMerchant,
  statusInquiry,
};
