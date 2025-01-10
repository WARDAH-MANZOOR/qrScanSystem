import dotenv from "dotenv";
import axios from "axios";
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
import type { IEasyPaisaPayload } from "../../types/merchant.d.ts";
import { transactionService } from "../../services/index.js";
import { PROVIDERS } from "../../constants/providers.js";
import RSAEncryption from "../../utils/RSAEncryption.js";
import { merchantService } from "../../services/index.js";
import type {
  DisbursementPayload,
  IEasyLoginPayload,
} from "../../types/providers.js";
import { IDisbursement } from "../../types/merchant.js";

import {
  calculateDisbursement,
  getEligibleTransactions,
  getMerchantRate,
  updateTransactions,
} from "./disbursement.js";
import { easyPaisaDisburse } from "../../services/index.js";
import { Decimal, JsonObject } from "@prisma/client/runtime/library";
import bankDetails from "../../data/banks.json" with { type: 'json' };
import { parse, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Parser } from "json2csv";

dotenv.config();

function stringToBoolean(value: string): boolean {
  return value.toLowerCase() === "true";
}

const getMerchantChannel = async (merchantId: string) => {
  return await prisma.merchant.findFirst({
    where: {
      uid: merchantId
    },
    select: {
      easypaisaPaymentMethod: true
    }
  })
}

const getMerchantInquiryMethod = async (merchantId: string) => {
  return await prisma.merchant.findFirst({
    where: {
      uid: merchantId
    },
    select: {
      easypaisaInquiryMethod: true
    }
  })
}

const getTransaction = async (merchantId: string, transactionId: string) => {
  try {
    const id = await prisma.merchant.findFirst({
      where: {
        uid: merchantId,
      },
      select: {
        merchant_id: true
      }
    })
    if (!id) {
      throw new CustomError("Merchant Not Found", 400)
    }
    const txn = await prisma.transaction.findFirst({
      where: {
        merchant_transaction_id: transactionId,
        merchant_id: id?.merchant_id,
        providerDetails: {
          path: ['name'],
          equals: "Easypaisa"
        }
      },
    })
    if (!txn) {
      return {
        message: "Transaction not found",
        statusCode: 500
      }
    }
    // orderId, transactionStatus, transactionAmount / amount, transactionDateTime / createdDateTime, msisdn, responseDesc/ transactionStatus, responseMode: "MA"
    let data = {
      "orderId": txn?.merchant_transaction_id,
      "transactionStatus": txn?.status,
      "transactionAmount": txn?.original_amount,
      "transactionDateTime": txn?.date_time,
      "msisdn": (txn?.providerDetails as JsonObject)?.msisdn,
      "responseDesc": txn?.response_message,
      "responseMode": "MA",
      "statusCode": 201
    }
    return data;
  }
  catch (err: any) {
    throw new CustomError(err?.message || "Error getting transaction", 500);
  }
}
const initiateEasyPaisa = async (merchantId: string, params: any) => {
  let saveTxn;
  try {
    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }

    const findMerchant = await prisma.merchant.findFirst({
      where: {
        uid: merchantId,
      },
      include: {
        commissions: true,
      },
    });

    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    const easyPaisaMerchant = await prisma.easyPaisaMerchant.findFirst({
      where: {
        id: findMerchant.easyPaisaMerchantId ?? undefined,
      },
    });

    if (!easyPaisaMerchant) {
      throw new CustomError("Gateway merchant not found", 404);
    }
    const phone = transactionService.convertPhoneNumber(params.phone)
    let id = transactionService.createTransactionId();
    let id2 = params.order_id || id;
    const easyPaisaTxPayload = {
      orderId: id2,
      storeId: easyPaisaMerchant.storeId,
      transactionAmount: params.amount,
      transactionType: "MA",
      mobileAccountNo: phone,
      emailAddress: params.email,
    };

    const base64Credentials = Buffer.from(
      `${easyPaisaMerchant.username}:${easyPaisaMerchant.credentials}`
    ).toString("base64");

    let data = JSON.stringify(easyPaisaTxPayload);

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://sea-turtle-app-bom3q.ondigitalocean.app/forward",
      headers: {
        Credentials: `${base64Credentials}`,
        "Content-Type": "application/json",
      },
      data: data,
    };

    saveTxn = await transactionService.createTxn({
      order_id: id2,
      transaction_id: id,
      amount: params.amount,
      status: "pending",
      type: params.type,
      merchant_id: findMerchant.merchant_id,
      commission:
        +findMerchant.commissions[0].commissionGST +
        +findMerchant.commissions[0].commissionRate +
        +findMerchant.commissions[0].commissionWithHoldingTax,
      settlementDuration: findMerchant.commissions[0].settlementDuration,
      providerDetails: {
        id: easyPaisaMerchant.id,
        name: PROVIDERS.EASYPAISA,
        msisdn: phone
      },
    });

    // console.log("saveTxn", saveTxn);

    const response: any = await axios.request(config);
    // console.log("🚀 ~ initiateEasyPaisa ~ response:", response.data);
    if (response?.data.responseCode == "0000") {
      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "completed",
          response_message: response.data.responseDesc,
        },
        findMerchant.commissions[0].settlementDuration
      );
      transactionService.sendCallback(
        findMerchant.webhook_url as string,
        saveTxn,
        phone,
        "payin",
        findMerchant.encrypted == "True" ? true : false,
        true
      );
      return {
        txnNo: saveTxn.merchant_transaction_id,
        txnDateTime: saveTxn.date_time,
        statusCode: response?.data.responseCode
      };
    } else {
      console.log("Error Payload: ", response.data)
      console.log("🚀 EasyPaisa Error", response.data?.responseDesc);
      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "failed",
          response_message: response.data?.responseDesc == "SYSTEM ERROR" ? "User did not respond" : response.data?.responseDesc,
        },
        findMerchant.commissions[0].settlementDuration
      );

      throw new CustomError(
        response.data?.responseDesc == "SYSTEM ERROR" ? "User did not respond" : response.data?.responseDesc,
        500
      );
    }
  } catch (error: any) {
    console.log("Error: ", error)
    return {
      message: error?.message || "An error occurred while initiating the transaction",
      statusCode: error?.statusCode || 500,
      txnNo: saveTxn?.merchant_transaction_id
    }
  }
};

const initiateEasyPaisaAsync = async (merchantId: string, params: any) => {
  let saveTxn: Awaited<ReturnType<typeof transactionService.createTxn>> | undefined;
  try {
    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }

    const findMerchant = await prisma.merchant.findFirst({
      where: {
        uid: merchantId,
      },
      include: {
        commissions: true,
      },
    });

    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    const easyPaisaMerchant = await prisma.easyPaisaMerchant.findFirst({
      where: {
        id: findMerchant.easyPaisaMerchantId ?? undefined,
      },
    });

    if (!easyPaisaMerchant) {
      throw new CustomError("Gateway merchant not found", 404);
    }

    const phone = transactionService.convertPhoneNumber(params.phone);
    let id = transactionService.createTransactionId();
    let id2 = params.order_id || id;
    const easyPaisaTxPayload = {
      orderId: id2,
      storeId: easyPaisaMerchant.storeId,
      transactionAmount: params.amount,
      transactionType: "MA",
      mobileAccountNo: phone,
      emailAddress: params.email,
    };

    const base64Credentials = Buffer.from(
      `${easyPaisaMerchant.username}:${easyPaisaMerchant.credentials}`
    ).toString("base64");

    let data = JSON.stringify(easyPaisaTxPayload);

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://sea-turtle-app-bom3q.ondigitalocean.app/forward",
      headers: {
        Credentials: `${base64Credentials}`,
        "Content-Type": "application/json",
      },
      data: data,
    };

    // Save transaction immediately with "pending" status
    saveTxn = await transactionService.createTxn({
      order_id: id2,
      transaction_id: id,
      amount: params.amount,
      status: "pending",
      type: params.type,
      merchant_id: findMerchant.merchant_id,
      commission:
        +findMerchant.commissions[0].commissionGST +
        +findMerchant.commissions[0].commissionRate +
        +findMerchant.commissions[0].commissionWithHoldingTax,
      settlementDuration: findMerchant.commissions[0].settlementDuration,
      providerDetails: {
        id: easyPaisaMerchant.id,
        name: PROVIDERS.EASYPAISA,
        msisdn: phone,
      },
    });

    // Return pending status and transaction ID immediately
    setImmediate(async () => {
      try {
        const response: any = await axios.request(config);

        if (response?.data.responseCode === "0000") {
          await transactionService.updateTxn(
            saveTxn?.transaction_id as string,
            {
              status: "completed",
              response_message: response.data.responseDesc,
            },
            findMerchant.commissions[0].settlementDuration
          );

          transactionService.sendCallback(
            findMerchant.webhook_url as string,
            saveTxn,
            phone,
            "payin",
            true,
            true
          );
        } else {
          console.log("🚀 EasyPaisa Error", response.data?.responseDesc);

          await transactionService.updateTxn(
            saveTxn?.transaction_id as string,
            {
              status: "failed",
              response_message: response.data.responseDesc,
            },
            findMerchant.commissions[0].settlementDuration
          );
        }
      } catch (error: any) {
        console.error("🚀 Error processing Easypaisa response:", error.message);
        await transactionService.updateTxn(
          saveTxn?.transaction_id as string,
          {
            status: "failed",
            response_message: error.message,
          },
          findMerchant.commissions[0].settlementDuration
        );
      }
    });

    return {
      txnNo: saveTxn.merchant_transaction_id,
      txnDateTime: saveTxn.date_time,
      statusCode: "pending",
    };
  } catch (error: any) {
    return {
      message:
        error?.message || "An error occurred while initiating the transaction",
      statusCode: error?.statusCode || 500,
      txnNo: saveTxn?.merchant_transaction_id || null,
    };
  }
};

const createMerchant = async (merchantData: IEasyPaisaPayload) => {
  try {
    if (!merchantData.metadata) {
      merchantData.metadata = {};
    }

    if (!merchantData) {
      throw new CustomError("Merchant data is required", 400);
    }

    const easyPaisaMerchant = await prisma.$transaction(async (prisma) => {
      return prisma.easyPaisaMerchant.create({
        data: merchantData,
      });
    });

    if (!easyPaisaMerchant) {
      throw new CustomError(
        "An error occurred while creating the merchant",
        500
      );
    }
    return {
      message: "Merchant created successfully",
      data: easyPaisaMerchant,
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while creating the merchant",
      500
    );
  }
};

const getMerchant = async (merchantId: string) => {
  try {
    const where: any = {};

    if (merchantId) {
      where["id"] = parseInt(merchantId);
    }

    const merchant = await prisma.easyPaisaMerchant.findMany({
      where: where,
      orderBy: {
        id: "desc",
      },
    });

    if (!merchant) {
      throw new CustomError("Merchant not found", 404);
    }

    return {
      message: "Merchant retrieved successfully",
      data: merchant,
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while reading the merchant",
      500
    );
  }
};

const updateMerchant = async (merchantId: string, updateData: any) => {
  try {
    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }

    if (!updateData) {
      throw new CustomError("Update data is required", 400);
    }

    const updatedMerchant = await prisma.$transaction(async (prisma) => {
      return prisma.easyPaisaMerchant.update({
        where: {
          id: parseInt(merchantId),
        },
        data: updateData,
      });
    });

    if (!updatedMerchant) {
      throw new CustomError(
        "An error occurred while updating the merchant",
        500
      );
    }

    return {
      message: "Merchant updated successfully",
      data: updatedMerchant,
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while updating the merchant",
      500
    );
  }
};

const deleteMerchant = async (merchantId: string) => {
  try {
    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }

    const deletedMerchant = await prisma.$transaction(async (prisma) => {
      return prisma.easyPaisaMerchant.delete({
        where: {
          id: parseInt(merchantId),
        },
      });
    });

    if (!deletedMerchant) {
      throw new CustomError(
        "An error occurred while deleting the merchant",
        500
      );
    }

    return {
      message: "Merchant deleted successfully",
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while deleting the merchant",
      500
    );
  }
};

const easypaisainquiry = async (param: any, merchantId: string) => {
  let merchant = await prisma.merchant.findFirst({
    where: { uid: merchantId },
    include: {
      easyPaisaMerchant: true,
    },
  });
  let data = JSON.stringify({
    orderId: param.orderId,
    storeId: merchant?.easyPaisaMerchant?.storeId,
    accountNum: merchant?.easyPaisaMerchant?.accountNumber,
  });
  console.log("Data: ", data);

  const base64Credentials = Buffer.from(
    `${merchant?.easyPaisaMerchant?.username}:${merchant?.easyPaisaMerchant?.credentials}`
  ).toString("base64");
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://sea-turtle-app-bom3q.ondigitalocean.app/inquiry",
    headers: {
      Credentials: base64Credentials,
      "Content-Type": "application/json",
    },
    data: data,
  };

  let res: any = await axios.request(config);
  console.log(res.data)
  if (res.data.responseCode == "0000") {
    return {
      "orderId": res.data.orderId,
      "transactionStatus": res.data.transactionStatus == "PAID" ? "Completed" : res.data.transactionStatus,
      "transactionAmount": res.data.transactionAmount,
      "transactionDateTime": res.data.transactionDateTime,
      "msisdn": res.data.msisdn,
      "responseDesc": res.data.responseDesc,
      "responseMode": "MA"
    }
  } else {
    return {
      message: "Transaction Not Found",
      statusCode: 500
    }
  }
};

const createRSAEncryptedPayload = async (url: string) => {
  const inputEnc = url;
  try {
    const publicKeyPath = "src/keys/publickey.pem";
    const publicKey = RSAEncryption.getPublicKey(publicKeyPath);
    const outputEnc = RSAEncryption.encrypt(inputEnc, publicKey);
    return outputEnc;
  } catch (error) {
    console.error("Error:", error);
  }
};

const corporateLogin = async (obj: IDisbursement) => {
  try {
    return await axios
      .post(
        "https://rgw.8798-f464fa20.eu-de.ri1.apiconnect.appdomain.cloud/tmfb/gateway/corporate-solution-corporate-login",
        {
          LoginPayload: await createRSAEncryptedPayload(
            `${obj.MSISDN}:${obj.pin}`
          ),
        },
        {
          headers: {
            "X-IBM-Client-Id": obj.clientId,
            "X-IBM-Client-Secret": obj.clientSecret,
            "X-Channel": obj.xChannel,
            "Content-Type": "application/json",
          },
        }
      )
      .then((res) => {
        return res?.data;
      })
      .catch((error) => {
        console.error("Error:", error?.response?.data);
      });
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while initiating the transaction",
      500
    );
  }
};

const createDisbursement = async (
  obj: DisbursementPayload,
  merchantId: string
) => {
  try {
    // validate Merchant
    const findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.EasyPaisaDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await easyPaisaDisburse
      .getDisburseAccount(findMerchant.EasyPaisaDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    // Phone number validation (must start with 92)
    if (!obj.phone.startsWith("92")) {
      throw new CustomError("Number should start with 92", 400);
    }

    // Fetch merchant financial terms
    let rate = await getMerchantRate(prisma, findMerchant.merchant_id);

    const transactions = await getEligibleTransactions(
      findMerchant.merchant_id,
      prisma
    );
    if (transactions.length === 0) {
      throw new CustomError("No eligible transactions to disburse", 400);
    }
    let updates: TransactionUpdate[] = [];
    let totalDisbursed = new Decimal(0);
    let amountDecimal;
    if (obj.amount) {
      amountDecimal = new Decimal(obj.amount);
    } else {
      updates = transactions.map((t: any) => ({
        transaction_id: t.transaction_id,
        disbursed: true,
        balance: new Decimal(0),
        settled_amount: t.settled_amount,
        original_amount: t.original_amount,
      }));
      totalDisbursed = transactions.reduce(
        (sum: Decimal, t: any) => sum.plus(t.balance),
        new Decimal(0)
      );
      amountDecimal = totalDisbursed;
    }
    // Calculate total deductions and merchant amount
    const totalCommission = amountDecimal.mul(rate.disbursementRate);
    const totalGST = amountDecimal.mul(rate.disbursementGST);
    const totalWithholdingTax = amountDecimal.mul(
      rate.disbursementWithHoldingTax
    );
    const totalDeductions = totalCommission
      .plus(totalGST)
      .plus(totalWithholdingTax);
    const merchantAmount = obj.amount
      ? amountDecimal.plus(totalDeductions)
      : amountDecimal.minus(totalDeductions);

    // Get eligible transactions

    if (obj.amount) {
      const result = calculateDisbursement(transactions, merchantAmount);
      updates = result.updates;
      totalDisbursed = result.totalDisbursed;
    }

    const getTimeStamp: IEasyLoginPayload = await corporateLogin(
      findDisbureMerch
    );
    const creatHashKey = await createRSAEncryptedPayload(
      `${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`
    );

    const ma2ma: any = await axios
      .post(
        "https://sea-turtle-app-bom3q.ondigitalocean.app/epd-ma",
        {
          Amount: obj.amount ? obj.amount : merchantAmount,
          MSISDN: findDisbureMerch.MSISDN,
          ReceiverMSISDN: obj.phone,
        },
        {
          headers: {
            "X-Hash-Value": creatHashKey,
            "X-IBM-Client-Id": findDisbureMerch.clientId,
            "X-IBM-Client-Secret": findDisbureMerch.clientSecret,
            "X-Channel": findDisbureMerch.xChannel,
            accept: "application/json",
            "content-type": "application/json",
          },
        }
      )
      .then((res) => res?.data)
      .catch((error) => {
        throw new CustomError(error?.response?.data?.ResponseMessage, 500);
      });
    let id = transactionService.createTransactionId();
    let data: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string; } = {};
    if (obj.order_id) {
      data["merchant_custom_order_id"] = obj.order_id;
    }
    else {
      data["merchant_custom_order_id"] = id;
    }
    // else {
    data["transaction_id"] = ma2ma.TransactionReference;
    data["system_order_id"] = id;
    // }
    // Get the current date
    const date = new Date();

    // Define the Pakistan timezone
    const timeZone = 'Asia/Karachi';

    // Convert the date to the Pakistan timezone
    const zonedDate = toZonedTime(date, timeZone);
    if (ma2ma.ResponseCode != 0) {
      console.log("Disbursement Failed ")
      const txn = await prisma.disbursement.create({
        data: {
          ...data,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: zonedDate,
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: obj.amount ? obj.amount : merchantAmount,
          platform: ma2ma.Fee,
          account: obj.phone,
          provider: PROVIDERS.EASYPAISA,
          status: "failed",
          response_message: ma2ma.ResponseMessage
        },
      });
      console.log("Disbursement: ", txn)
      // return;
      throw new CustomError(ma2ma.ResponseMessage, 500);
    }

    return await prisma.$transaction(
      async (tx) => {
        // Update transactions to adjust balances
        await updateTransactions(updates, tx);

        // Create disbursement record
        let disbursement = await tx.disbursement.create({
          data: {
            ...data,
            // transaction_id: id,
            merchant_id: Number(findMerchant.merchant_id),
            disbursementDate: zonedDate,
            transactionAmount: amountDecimal,
            commission: totalCommission,
            gst: totalGST,
            withholdingTax: totalWithholdingTax,
            merchantAmount: obj.amount ? obj.amount : merchantAmount,
            platform: ma2ma.Fee,
            account: obj.phone,
            provider: PROVIDERS.EASYPAISA,
            status: "completed",
            response_message: "success"
          },
        });
        let webhook_url: string;
        if (findMerchant.callback_mode == "DOUBLE") {
          webhook_url = findMerchant.payout_callback as string;
        }
        else {
          webhook_url = findMerchant.webhook_url as string;
        }
        transactionService.sendCallback(
          webhook_url,
          {
            original_amount: obj.amount ? obj.amount : merchantAmount,
            date_time: zonedDate,
            merchant_transaction_id: disbursement.merchant_custom_order_id,
            merchant_id: findMerchant.merchant_id,
          },
          obj.phone,
          "payout",
          stringToBoolean(findMerchant.encrypted as string),
          false
        );

        return {
          message: "Disbursement created successfully",
          merchantAmount: obj.amount
            ? obj.amount.toString()
            : merchantAmount.toString(),
          order_id: disbursement.merchant_custom_order_id,
          externalApiResponse: {
            TransactionReference: disbursement.merchant_custom_order_id,
            TransactionStatus: ma2ma.TransactionStatus,
          },
        };
      },
      {
        maxWait: 5000,
        timeout: 60000,
      }
    );
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while initiating the transaction",
      500
    );
  }
};

const getDisbursement = async (merchantId: number, params: any) => {
  try {
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");

    const customWhere = {
      deletedAt: null,
    } as any;

    if (merchantId) {
      customWhere["merchant_id"] = +merchantId;
    }

    if (params.account) {
      customWhere["account"] = {
        contains: params.account
      };
    }

    if (params.transaction_id) {
      customWhere["transaction_id"] = {
        contains: params.transaction_id
      }
    }

    if (startDate && endDate) {
      const todayStart = parseISO(startDate as string);
      const todayEnd = parseISO(endDate as string);

      customWhere["disbursementDate"] = {
        gte: todayStart,
        lt: todayEnd,
      };
    }

    if (params.merchantTransactionId) {
      customWhere["merchant_custom_order_id"] = {
        contains: params.merchantTransactionId
      }
    }

    let { page, limit } = params;
    // Query based on provided parameters
    let skip, take;
    if (page && limit) {
      skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
      take = parseInt(limit as string);
    }

    const disbursements = await prisma.disbursement
      .findMany({
        ...(skip && { skip: +skip }),
        ...(take && { take: +take }),
        where: {
          ...customWhere,

        },
        orderBy: {
          disbursementDate: "desc",
        },
        include: {
          merchant: {
            select: {
              uid: true,
              full_name: true,
            },
          },
        },
      })
      .catch((err) => {
        throw new CustomError("Unable to get disbursement history", 500);
      });

    // loop through disbursements and add transaction details
    // for (let i = 0; i < disbursements.length; i++) {
    //   if (!disbursements[i].transaction_id) {
    //     disbursements[i].transaction = null;
    //   } else {
    //     const transaction = await prisma.transaction.findFirst({
    //       where: {
    //         transaction_id: disbursements[i].transaction_id,
    //       },
    //     });
    //     disbursements[i].transaction = transaction;
    //   }
    // }
    let meta = {};
    if (page && take) {
      // Get the total count of transactions
      const total = await prisma.disbursement.count({
        where: {
          ...customWhere,

        },
      });

      // Calculate the total number of pages
      const pages = Math.ceil(total / +take);
      meta = {
        total,
        pages,
        page: parseInt(page as string),
        limit: take
      }
    }
    const response = {
      transactions: disbursements.map((transaction) => ({
        ...transaction,
        jazzCashMerchant: transaction.merchant,
      })),
      meta,
    };
    return response;
  } catch (error: any) {
    throw new CustomError(
      error?.error || "Unable to get disbursement",
      error?.statusCode || 500
    );
  }
};

const exportDisbursement = async (merchantId: number, params: any) => {
  try {
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");

    const customWhere = {
      deletedAt: null,
    } as any;

    if (merchantId) {
      customWhere["merchant_id"] = +merchantId;
    }

    if (params.account) {
      customWhere["account"] = {
        contains: params.account
      };
    }

    if (params.transaction_id) {
      customWhere["transaction_id"] = {
        contains: params.transaction_id
      }
    }

    if (startDate && endDate) {
      const todayStart = parseISO(startDate as string);
      const todayEnd = parseISO(endDate as string);

      customWhere["disbursementDate"] = {
        gte: todayStart,
        lt: todayEnd,
      };
    }

    if (params.merchantTransactionId) {
      customWhere["merchant_custom_order_id"] = {
        contains: params.merchantTransactionId
      }
    }

    const disbursements = await prisma.disbursement
      .findMany({
        where: {
          ...customWhere,
        },
        orderBy: {
          disbursementDate: "desc",
        },
        include: {
          merchant: {
            select: {
              uid: true,
              full_name: true,
            },
          },
        },
      })
      .catch((err) => {
        throw new CustomError("Unable to get disbursement history", 500);
      });

    const totalAmount = disbursements.reduce((sum, transaction) => sum + Number(transaction.merchantAmount), 0);

    // res.setHeader('Content-Type', 'text/csv');
    // res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');

    const fields = [
      'merchant',
      'merchant_id',
      'disbursement_date',
      'transaction_amount',
      'commission',
      'gst',
      'withholding_tax',
      'merchant_amount'
    ];

    const data = disbursements.map(transaction => ({
      merchant: transaction.merchant.full_name,
      merchant_id: transaction.merchant.uid,
      disbursement_date: transaction.disbursementDate,
      transaction_amount: transaction.transactionAmount,
      commission: transaction.commission,
      gst: transaction.gst,
      withholding_tax: transaction.withholdingTax,
      merchant_amount: transaction.merchantAmount,
    }));

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);
    return `${csv}\nTotal Settled Amount,,${totalAmount}`;
    // loop through disbursements and add transaction details
    // for (let i = 0; i < disbursements.length; i++) {
    //   if (!disbursements[i].transaction_id) {
    //     disbursements[i].transaction = null;
    //   } else {
    //     const transaction = await prisma.transaction.findFirst({
    //       where: {
    //         transaction_id: disbursements[i].transaction_id,
    //       },
    //     });
    //     disbursements[i].transaction = transaction;
    //   }
    // }
  } catch (error: any) {
    throw new CustomError(
      error?.error || "Unable to get disbursement",
      error?.statusCode || 500
    );
  }
};

const disburseThroughBank = async (obj: any, merchantId: string) => {
  try {
    // validate Merchant
    const findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.EasyPaisaDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await easyPaisaDisburse
      .getDisburseAccount(findMerchant.EasyPaisaDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    // Phone number validation (must start with 92)
    // if (!obj.phone.startsWith("92")) {
    //   throw new CustomError("Number should start with 92", 400);
    // }
    // Fetch merchant financial terms
    const bank = bankDetails.find((bank) => bank.BankName === obj.bankName);
    if (!bank) {
      throw new CustomError("Bank not found", 404);
    }

    let rate = await getMerchantRate(prisma, findMerchant.merchant_id);

    const transactions = await getEligibleTransactions(
      findMerchant.merchant_id,
      prisma
    );
    if (transactions.length === 0) {
      throw new CustomError("No eligible transactions to disburse", 400);
    }
    let updates: TransactionUpdate[] = [];
    let totalDisbursed = new Decimal(0);
    let amountDecimal;
    if (obj.amount) {
      amountDecimal = new Decimal(obj.amount);
    } else {
      updates = transactions.map((t: any) => ({
        transaction_id: t.transaction_id,
        disbursed: true,
        balance: new Decimal(0),
        settled_amount: t.settled_amount,
        original_amount: t.original_amount,
      }));
      totalDisbursed = transactions.reduce(
        (sum: Decimal, t: any) => sum.plus(t.balance),
        new Decimal(0)
      );
      amountDecimal = totalDisbursed;
    }
    // Calculate total deductions and merchant amount
    const totalCommission = amountDecimal.mul(rate.disbursementRate);
    const totalGST = amountDecimal.mul(rate.disbursementGST);
    const totalWithholdingTax = amountDecimal.mul(
      rate.disbursementWithHoldingTax
    );
    const totalDeductions = totalCommission
      .plus(totalGST)
      .plus(totalWithholdingTax);
    const merchantAmount = obj.amount
      ? amountDecimal.plus(totalDeductions)
      : amountDecimal.minus(totalDeductions);

    // Get eligible transactions

    if (obj.amount) {
      const result = calculateDisbursement(transactions, merchantAmount);
      updates = result.updates;
      totalDisbursed = result.totalDisbursed;
    }
    const getTimeStamp: IEasyLoginPayload = await corporateLogin(
      findDisbureMerch
    );

    const creatHashKey = await createRSAEncryptedPayload(
      `${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`
    );

    const headers = {
      "X-IBM-Client-Id": findDisbureMerch.clientId,
      "X-IBM-Client-Secret": findDisbureMerch.clientSecret,
      "X-Channel": findDisbureMerch.xChannel,
      "X-Hash-Value": `${creatHashKey}`,
    };

    let data = {
      AccountNumber: obj.accountNo,
      BankTitle: bank.BankTitle,
      MSISDN: findDisbureMerch.MSISDN,
      ReceiverMSISDN: obj.phone,
      BankShortName: bank.BankShortName,
      TransactionPurpose: obj.purpose,
      Amount: obj.amount,
    };

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://sea-turtle-app-bom3q.ondigitalocean.app/epd-ibft-i",
      headers: headers,
      data: data,
    };

    let res = await axios.request(config);
    let id = transactionService.createTransactionId();
    let data2: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string; } = {};

    if (res.data.ResponseCode != "0") {
      if (obj.order_id) {
        data2["merchant_custom_order_id"] = obj.order_id;
      }
      else {
        data2["merchant_custom_order_id"] = id;
      }
      // else {
      data2["transaction_id"] = res.data.TransactionReference;
      data2["system_order_id"] = id;
      // Get the current date
      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      console.log("Transfer Inquiry Error: ", res.data);
      await prisma.disbursement.create({
        data: {
          ...data2,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: zonedDate,
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: obj.amount ? obj.amount : merchantAmount,
          platform: res.data.Fee,
          account: obj.accountNo,
          provider: obj.bankName,
          status: "failed",
          response_message: res.data.ResponseMessage
        },
      })
      throw new CustomError("Error conducting transfer inquiry", 500);
    }
    let data3 = {
      AccountNumber: obj.accountNo,
      BankTitle: bank.BankTitle,
      MSISDN: findDisbureMerch.MSISDN,
      ReceiverMSISDN: obj.phone,
      BankShortName: bank.BankShortName,
      TransactionPurpose: obj.purpose,
      Amount: obj.amount,
      SenderName: res.data.Name,
      Branch: res.data.Branch,
      Username: res.data.Username,
      ReceiverIBAN: res.data.ReceiverIBAN,
    };

    config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://sea-turtle-app-bom3q.ondigitalocean.app/epd-ibft-t",
      headers: headers,
      data: data3,
    };

    let res2 = await axios.request(config);
    if (res2.data.ResponseCode != "0") {
      if (obj.order_id) {
        data2["merchant_custom_order_id"] = obj.order_id;
      }
      else {
        data2["merchant_custom_order_id"] = id;
      }
      // else {
      data2["transaction_id"] = res.data.TransactionReference;
      data2["system_order_id"] = id;
      // Get the current date
      const date = new Date();

      // Define the Pakistan timezone
      const timeZone = 'Asia/Karachi';

      // Convert the date to the Pakistan timezone
      const zonedDate = toZonedTime(date, timeZone);
      await prisma.disbursement.create({
        data: {
          ...data2,
          // transaction_id: id,
          merchant_id: Number(findMerchant.merchant_id),
          disbursementDate: zonedDate,
          transactionAmount: amountDecimal,
          commission: totalCommission,
          gst: totalGST,
          withholdingTax: totalWithholdingTax,
          merchantAmount: obj.amount ? obj.amount : merchantAmount,
          platform: res2.data.Fee,
          account: obj.accountNo,
          provider: obj.bankName,
          status: "failed",
          response_message: res.data.ResponseMessage
        },
      });
      throw new CustomError("Error conducting transfer", 500);
    }
    return await prisma.$transaction(
      async (tx) => {
        await updateTransactions(updates, tx);
        if (obj.order_id) {
          data2["merchant_custom_order_id"] = obj.order_id;
        }
        else {
          data2["merchant_custom_order_id"] = id;
        }
        // else {
        data2["transaction_id"] = res.data.TransactionReference;
        data2["system_order_id"] = id;
        // Get the current date
        const date = new Date();

        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';

        // Convert the date to the Pakistan timezone
        const zonedDate = toZonedTime(date, timeZone);
        // Create disbursement record
        let disbursement = await tx.disbursement.create({
          data: {
            ...data2,
            // transaction_id: id,
            merchant_id: Number(findMerchant.merchant_id),
            disbursementDate: zonedDate,
            transactionAmount: amountDecimal,
            commission: totalCommission,
            gst: totalGST,
            withholdingTax: totalWithholdingTax,
            merchantAmount: obj.amount ? obj.amount : merchantAmount,
            platform: res2.data.Fee,
            account: obj.accountNo,
            provider: obj.bankName,
            status: "completed",
            response_message: "success"
          },
        });
        let webhook_url;
        if (findMerchant.callback_mode == "DOUBLE") {
          webhook_url = findMerchant.payout_callback as string;
        }
        else {
          webhook_url = findMerchant.webhook_url as string;
        }
        transactionService.sendCallback(
          webhook_url,
          {
            original_amount: obj.amount ? obj.amount : merchantAmount,
            date_time: zonedDate,
            merchant_transaction_id: disbursement.merchant_custom_order_id,
            merchant_id: findMerchant.merchant_id,
          },
          obj.phone,
          "payout",
          stringToBoolean(findMerchant.encrypted as string),
          false
        );

        return {
          message: "Disbursement created successfully",
          merchantAmount: obj.amount
            ? obj.amount.toString()
            : merchantAmount.toString(),
          order_id: disbursement.merchant_custom_order_id,
          externalApiResponse: {
            TransactionReference: disbursement.merchant_custom_order_id,
            TransactionStatus: res2.data.TransactionStatus,
          },
        };
      },
      {
        maxWait: 5000,
        timeout: 60000,
      }
    );
  } catch (err) {
    console.log(err);
    throw new CustomError("Disbursement Failed", 500);
  }
};

const accountBalance = async (merchantId: string) => {
  try {
    // validate Merchant
    const findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.EasyPaisaDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await easyPaisaDisburse
      .getDisburseAccount(findMerchant.EasyPaisaDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }

    const getTimeStamp: IEasyLoginPayload = await corporateLogin(
      findDisbureMerch
    );
    const creatHashKey = await createRSAEncryptedPayload(
      `${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`
    );
    console.log(creatHashKey)

    let data = JSON.stringify({
      "msisdn": findDisbureMerch.MSISDN
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://rgw.8798-f464fa20.eu-de.ri1.apiconnect.appdomain.cloud/tmfb/gateway/account-balance/account-bal',
      headers: {
        "X-Hash-Value": creatHashKey,
        "X-IBM-Client-Id": findDisbureMerch.clientId,
        "X-IBM-Client-Secret": findDisbureMerch.clientSecret,
        "X-Channel": findDisbureMerch.xChannel,
        accept: "application/json",
        "content-type": "application/json",
      },
      data: data
    };

    let response = await axios.request(config);
    if (response?.data?.ResponseCode != "0") {
      console.log(response?.data)
      throw new CustomError("Error while getting balance", 500);
    }
    console.log(response?.data)
    return {
      amount: response?.data?.amount
    };
  }
  catch (err: any) {
    throw new CustomError(
      err?.message || "An error occurred while initiating the transaction",
      500
    );
  }
}

const transactionInquiry = async (obj: any, merchantId: string) => {
  try {
    // validate Merchant
    const findMerchant = await merchantService.findOne({
      uid: merchantId,
    });

    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    if (!findMerchant.EasyPaisaDisburseAccountId) {
      throw new CustomError("Disbursement account not assigned.", 404);
    }

    // find disbursement merchant
    const findDisbureMerch: any = await easyPaisaDisburse
      .getDisburseAccount(findMerchant.EasyPaisaDisburseAccountId)
      .then((res) => res?.data);

    if (!findDisbureMerch) {
      throw new CustomError("Disbursement account not found", 404);
    }
    const transaction = await prisma.disbursement.findFirst({
      where: {
        merchant_custom_order_id: obj.transactionId,
        merchant_id: findMerchant.merchant_id
      }
    });
    if (!transaction || !transaction?.transaction_id) {
      throw new CustomError("Transaction not found", 500)
    }
    const getTimeStamp: IEasyLoginPayload = await corporateLogin(
      findDisbureMerch
    );
    const creatHashKey = await createRSAEncryptedPayload(
      `${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`
    );

    let data = JSON.stringify({
      "transactionID": transaction.transaction_id
    });

    console.log(data)
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://rgw.8798-f464fa20.eu-de.ri1.apiconnect.appdomain.cloud/tmfb/gateway/transaction-status-inquiry/TransactionStatusInquiry',
      headers: {
        'X-Hash-Value': creatHashKey,
        'X-IBM-Client-Id': findDisbureMerch.clientId,
        'X-IBM-Client-Secret': findDisbureMerch.clientSecret,
        'X-Channel': findDisbureMerch.xChannel,
      },
      data: data
    };

    let response = await axios.request(config)
    if (response?.data?.ResponseCode != "0") {
      console.log(response?.data)
      throw new CustomError("Error while getting balance", 500);
    }
    console.log(response?.data)
    let data3 = response?.data;
    return {
      ...data3,
      transactionID: obj.transactionId
    };
  }
  catch (err: any) {
    throw new CustomError(
      err?.message || "An error occurred while initiating the transaction",
      500
    );
  }
}

// const transactionINquiry

export default {
  initiateEasyPaisa,
  createMerchant,
  getMerchant,
  updateMerchant,
  deleteMerchant,
  easypaisainquiry,
  createDisbursement,
  getDisbursement,
  disburseThroughBank,
  // getTransaction,
  initiateEasyPaisaAsync,
  accountBalance,
  transactionInquiry,
  exportDisbursement
};

// const axios = require('axios');


// ...(skip && { skip: +skip }),
//         ...(take && { take: +take }),
