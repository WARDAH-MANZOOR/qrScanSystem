import dotenv from "dotenv";
import axios from "axios";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import type { IEasyPaisaPayload } from "types/merchant.d.ts";
import { transactionService } from "services/index.js";
import { PROVIDERS } from "constants/providers.js";
import RSAEncryption from "utils/RSAEncryption.js";
import { merchantService } from "services/index.js";
import type {
  DisbursementPayload,
  IEasyLoginPayload,
} from "types/providers.js";
import { IDisbursement } from "types/merchant.js";

import {
  calculateDisbursement,
  getEligibleTransactions,
  getMerchantRate,
  updateTransactions,
} from "./disbursement.js";
import { easyPaisaDisburse } from "services/index.js";
import { Decimal } from "@prisma/client/runtime/library";
import ApiResponse from "utils/ApiResponse.js";
import bankDetails from "../../data/banks.json"
import { parse, parseISO } from "date-fns";

dotenv.config();

const initiateEasyPaisa = async (merchantId: string, params: any) => {
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
    let id = transactionService.createTransactionId();
    const easyPaisaTxPayload = {
      orderId: id,
      storeId: easyPaisaMerchant.storeId,
      transactionAmount: params.amount,
      transactionType: "MA",
      mobileAccountNo: params.phone,
      emailAddress: params.email,
    };

    const base64Credentials = Buffer.from(
      `${easyPaisaMerchant.username}:${easyPaisaMerchant.credentials}`
    ).toString("base64");

    let data = JSON.stringify(easyPaisaTxPayload);

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initiate-ma-transaction",
      headers: {
        Credentials: `${base64Credentials}`,
        "Content-Type": "application/json",
      },
      data: data,
    };

    const saveTxn = await transactionService.createTxn({
      order_id: params.order_id,
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
        params.phone,
        "payin"
      );
      return {
        txnNo: saveTxn.transaction_id,
        txnDateTime: saveTxn.date_time,
      };
    } else {
      console.log("🚀 EasyPaisa Error", response.data?.responseDesc);

      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "failed",
          response_message: response.data.responseDesc,
        },
        findMerchant.commissions[0].settlementDuration
      );

      throw new CustomError(
        "An error occurred while initiating the transaction",
        500
      );
    }
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while initiating the transaction",
      500
    );
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
  console.log(data);

  const base64Credentials = Buffer.from(
    `${merchant?.easyPaisaMerchant?.username}:${merchant?.easyPaisaMerchant?.credentials}`
  ).toString("base64");
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://easypay.easypaisa.com.pk/easypay-service/rest/v4/inquire-transaction",
    headers: {
      Credentials: base64Credentials,
      "Content-Type": "application/json",
    },
    data: data,
  };

  let res: any = await axios.request(config);
  if (res.data.responseCode == "0000") {
    return res.data;
  } else {
    throw new CustomError(
      res?.data?.responseDesc || "Internal Server Error",
      500
    );
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
        "https://rgw.8798-f464fa20.eu-de.ri1.apiconnect.appdomain.cloud/tmfb/gateway/MaToMA/Transfer",
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
    if (ma2ma.ResponseCode != 0) {
      throw new CustomError(ma2ma.ResponseMessage, 500);
    }

    return await prisma.$transaction(
      async (tx) => {
        // Update transactions to adjust balances
        await updateTransactions(updates, tx);

        let id = transactionService.createTransactionId();
        let data: { transaction_id?: string } = {};
        if (obj.order_id) {
          data["transaction_id"] = obj.order_id;
        } else {
          data["transaction_id"] = transactionService.createTransactionId();
        }
        let date = new Date();
        // Create disbursement record
        let disbursement = await tx.disbursement.create({
          data: {
            ...data,
            transaction_id: id,
            merchant_id: Number(findMerchant.merchant_id),
            disbursementDate: date,
            transactionAmount: amountDecimal,
            commission: totalCommission,
            gst: totalGST,
            withholdingTax: totalWithholdingTax,
            merchantAmount: obj.amount ? obj.amount : merchantAmount,
            platform: ma2ma.Fee,
            account: obj.phone,
            provider: PROVIDERS.EASYPAISA
          },
        });

        transactionService.sendCallback(
          findMerchant.webhook_url as string,
          {
            original_amount: obj.amount ? obj.amount : merchantAmount,
            date_time: date,
            transaction_id: disbursement.transaction_id,
          },
          obj.phone,
          "payout"
        );

        return {
          message: "Disbursement created successfully",
          merchantAmount: obj.amount
            ? obj.amount.toString()
            : merchantAmount.toString(),
          order_id: disbursement.transaction_id,
          externalApiResponse: {
            TransactionReference: ma2ma.TransactionReference,
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

    if (startDate && endDate) {
      const todayStart = parseISO(startDate as string);
      const todayEnd = parseISO(endDate as string);

      customWhere["disbursementDate"] = {
        gte: todayStart,
        lt: todayEnd,
      };
    }
    return await prisma.disbursement
      .findMany({
        where: {
          merchant_id: merchantId,
          ...customWhere,
        },
        include: {
          merchant: {
            select: {
              full_name: true
            }
          }
        }
      })
      .catch((err) => {
        throw new CustomError("Unable to get disbursement history", 500);
      });
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
    const bank = bankDetails.find(bank => bank.BankName === obj.bankName);
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

    let data = JSON.stringify({
      "AccountNumber": obj.accountNo,
      "BankTitle": bank.BankTitle,
      "MSISDN": findDisbureMerch.MSISDN,
      "ReceiverMSISDN": obj.phone,
      "BankShortName": bank.BankShortName,
      "TransactionPurpose": obj.purpose,
      "Amount": obj.amount
    });

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://rgw.8798-f464fa20.eu-de.ri1.apiconnect.appdomain.cloud/tmfb/gateway/SubscriberIBFT/Inquiry",
      headers: headers,
      data: data,
    };

    let res = await axios.request(config);
    if (res.data.ResponseCode != "0") {
      throw new CustomError("Error conducting transfer inquiry", 500);
    }

    data = JSON.stringify({
      "AccountNumber": obj.accountNo,
      "BankTitle": bank.BankTitle,
      "MSISDN": findDisbureMerch.MSISDN,
      "ReceiverMSISDN": obj.phone,
      "BankShortName": bank.BankShortName,
      "TransactionPurpose": obj.purpose,
      "Amount": obj.amount,
      "SenderName": res.data.Name,
      "Branch": res.data.Branch,
      "Username": res.data.Username,
      "ReceiverIBAN": res.data.ReceiverIBAN
    });

    config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://rgw.8798-f464fa20.eu-de.ri1.apiconnect.appdomain.cloud/tmfb/gateway/SubscriberIBFT/Transfer",
      headers: headers,
      data: data,
    };

    let res2 = await axios.request(config);
    if (res2.data.ResponseCode != "0") {
      throw new CustomError("Error conducting transfer inquiry", 500);
    }
    return await prisma.$transaction(
      async (tx) => {
        await updateTransactions(updates, tx);

        let id = transactionService.createTransactionId();
        let data2: { transaction_id?: string } = {};
        if (obj.order_id) {
          data2["transaction_id"] = obj.order_id;
        } else {
          data2["transaction_id"] = id;
        }
        let date = new Date();
        // Create disbursement record
        let disbursement = await tx.disbursement.create({
          data: {
            ...data2,
            transaction_id: id,
            merchant_id: Number(findMerchant.merchant_id),
            disbursementDate: date,
            transactionAmount: amountDecimal,
            commission: totalCommission,
            gst: totalGST,
            withholdingTax: totalWithholdingTax,
            merchantAmount: obj.amount ? obj.amount : merchantAmount,
            platform: res2.data.Fee,
            account: obj.accountNo,
            provider: obj.bankName
          },
        });

        transactionService.sendCallback(
          findMerchant.webhook_url as string,
          {
            original_amount: obj.amount ? obj.amount : merchantAmount,
            date_time: date,
            transaction_id: disbursement.transaction_id,
          },
          obj.phone,
          "payout"
        );

        return {
          message: "Disbursement created successfully",
          merchantAmount: obj.amount
            ? obj.amount.toString()
            : merchantAmount.toString(),
          order_id: disbursement.transaction_id,
          externalApiResponse: {
            TransactionReference: res2.data.TransactionReference,
            TransactionStatus: res2.data.TransactionStatus,
          },
        };
      },
      {
        maxWait: 5000,
        timeout: 60000
      })
  }
  catch (err) {
    console.log(err)
    throw new CustomError("Disbursement Failed", 500)
  }
};
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
};

// const axios = require('axios');
