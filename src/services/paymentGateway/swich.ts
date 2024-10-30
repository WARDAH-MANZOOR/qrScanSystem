import CustomError from "utils/custom_error.js";
import axios from "axios";
import dotenv from "dotenv";
import { ISwichPayload } from "types/merchant.js";
import prisma from "prisma/client.js";
import { decrypt, encrypt } from "utils/enc_dec.js";
import { transactionService } from "services/index.js";
import qs from "qs";
import { PROVIDERS } from "constants/providers.js";
dotenv.config();

const getAuthToken = async (id: number) => {
  const swichMerchant = await prisma.swichMerchant.findUnique({
    where: {
      id: id ?? undefined,
    },
  });

  if (!swichMerchant) {
    throw new CustomError("Swich Merchant Not Found", 400);
  }

  let data = qs.stringify({
    grant_type: "client_credentials",
    client_id: decrypt(swichMerchant?.clientId),
    client_secret: decrypt(swichMerchant?.clientSecret as string),
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://auth.swichnow.com/connect/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  let res = await axios.request(config);
  if (res.data.access_token) {
    return res.data.access_token;
  } else {
    throw new CustomError("Internal Server Error", 500);
  }
};
const initiateSwich = async (payload: any, merchantId: string) => {
  let saveTxn, findMerchant;
  try {
    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }

    findMerchant = await prisma.merchant.findFirst({
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
    
    let id = transactionService.createTransactionId();
    let data = JSON.stringify({
      customerTransactionId: id,
      categoryId: "2",
      channelId: payload.channel.toUpperCase() == "JAZZCASH" ? 10 : 8,
      item: "1",
      amount: payload.amount,
      remoteIPAddress: "139.59.40.220",
      msisdn: payload.msisdn,
      email: payload.email,
    });

    const authToken = await getAuthToken(
      findMerchant.swichMerchantId as number
    );
    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.swichnow.com/gateway/payin/purchase/ewallet",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      data: data,
    };

    saveTxn = await transactionService.createTxn({
      order_id: payload.order_id,
      transaction_id: id,
      amount: payload.amount,
      status: "pending",
      type: "wallet",
      merchant_id: findMerchant.merchant_id,
      commission:
        +findMerchant.commissions[0].commissionGST +
        +findMerchant.commissions[0].commissionRate +
        +findMerchant.commissions[0].commissionWithHoldingTax,
      settlementDuration: findMerchant.commissions[0].settlementDuration,
      providerDetails: {
        id: findMerchant.swichMerchantId as number,
        name: PROVIDERS.SWICH,
      },
    });

    let res = await axios.request(config);

    if (res.data.code === "0000") {
      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "completed",
          response_message: res.data.message,
        },
        findMerchant.commissions[0].settlementDuration
      );
      transactionService.sendCallback(
        findMerchant.webhook_url as string,
        saveTxn,
        payload.msisdn,
        "payin"
      );
      return {
        txnNo: saveTxn.transaction_id,
        txnDateTime: saveTxn.date_time,
      };
    } else {
      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "failed",
          response_message: res.data.message,
        },
        findMerchant.commissions[0].settlementDuration
      );
      throw new CustomError(
        "An error occurred while initiating the transaction",
        500
      );
    }
  } catch (err: any) {
    console.log(err);
    if (saveTxn && saveTxn.transaction_id) {
      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "failed",
          response_message: "An error occurred while initiating the transaction",
        },
        findMerchant?.commissions[0]?.settlementDuration as number
      );
    }
    throw new CustomError(
      "An error occurred while initiating the transaction",
      500
    );
  }
};

const createMerchant = async (merchantData: ISwichPayload) => {
  try {
    if (!merchantData) {
      throw new CustomError("Merchant data is required", 400);
    }

    const swichMerchant = await prisma.$transaction(async (tx) => {
      return tx.swichMerchant.create({
        data: {
          clientId: encrypt(merchantData.clientId),
          clientSecret: encrypt(merchantData.clientSecret),
        },
      });
    });

    if (!swichMerchant) {
      throw new CustomError(
        "An error occurred while creating the merchant",
        500
      );
    }
    return {
      message: "Merchant created successfully",
      data: swichMerchant,
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

    let merchant = await prisma.swichMerchant.findMany({
      where: where,
      orderBy: {
        id: "desc",
      },
    });

    merchant = merchant.map((obj) => {
      obj["clientId"] = decrypt(obj["clientId"]);
      obj["clientSecret"] = decrypt(obj["clientSecret"] as string);
      return obj;
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

    // Fetch existing data for the merchant
    const existingMerchant = await prisma.swichMerchant.findUnique({
      where: {
        id: parseInt(merchantId),
      },
    });

    if (!existingMerchant) {
      throw new Error("Merchant not found");
    }

    const updatedMerchant = await prisma.$transaction(async (tx) => {
      return tx.swichMerchant.update({
        where: {
          id: parseInt(merchantId),
        },
        data: {
          clientId:
            updateData.clientId != undefined
              ? encrypt(updateData.clientId)
              : existingMerchant.clientId,
          clientSecret:
            updateData.clientSecret != undefined
              ? encrypt(updateData.clientSecret)
              : existingMerchant.clientSecret,
        },
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
    console.log(error);
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

    const deletedMerchant = await prisma.$transaction(async (tx) => {
      return tx.swichMerchant.delete({
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

const swichTxInquiry = async (transactionId: string, merchantId: string) => {
  try {
    if (!transactionId) {
      throw new CustomError("Transaction ID is required", 400);
    }

    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }

    const findMerchant = await prisma.merchant.findFirst({
      where: {
        uid: merchantId,
      },
    });

    if (!findMerchant) {
      throw new CustomError("Merchant not found", 404);
    }

    const authToken = await getAuthToken(
      findMerchant.swichMerchantId as number
    );

    // find ClientId and ClientSecret from the database
    const swichMerchant = await prisma.swichMerchant.findUnique({
      where: {
        id: findMerchant.swichMerchantId as number,
      },
    });

    if (!swichMerchant) {
      throw new CustomError("Swich Merchant Not Found", 400);
    }

    const clientId = decrypt(swichMerchant.clientId);

    const txnInquiry = await axios
      .get(`https://api.swichnow.com/gateway/payin/inquire`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        params: {
          clientId: clientId,
          CustomerTransactionId: transactionId,
          RemoteIPAddress: "167.71.225.46",
        },
      })
      .catch((err) => {
        return err.response.data;
      });

    return txnInquiry;
  } catch (err: any) {
    throw new CustomError(
      err?.message || "An error occurred while inquiring the transaction",
      500
    );
  }
};



export default {
  initiateSwich,
  createMerchant,
  getMerchant,
  updateMerchant,
  deleteMerchant,
  swichTxInquiry,
};
