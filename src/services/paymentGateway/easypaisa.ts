import dotenv from "dotenv";
import axios from "axios";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import type { IEasyPaisaPayload } from "types/merchant.d.ts";
import { transactionService } from "services/index.js";
import { PROVIDERS } from "constants/providers.js";

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
      orderId: id,
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
      }
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
      transactionService.sendCallback(findMerchant.webhook_url as string,saveTxn,params.phone)
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
  console.log(data)

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
    throw new CustomError(res?.data?.responseDesc || "Internal Server Error", 500);
  }
};

export default {
  initiateEasyPaisa,
  createMerchant,
  getMerchant,
  updateMerchant,
  deleteMerchant,
  easypaisainquiry,
};
