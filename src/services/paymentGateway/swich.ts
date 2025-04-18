import CustomError from "../../utils/custom_error.js";
import axios from "axios";
import dotenv from "dotenv";
import { ISwichPayload } from "../../types/merchant.js";
import prisma from "../../prisma/client.js";
import { decrypt, encrypt } from "../../utils/enc_dec.js";
import { transactionService } from "../../services/index.js";
import qs from "qs";
import { PROVIDERS } from "../../constants/providers.js";
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
  let id = transactionService.createTransactionId();
  try {
    console.log(JSON.stringify({ event: "SWICH_PAYIN_INITIATED", order_id: payload.order_id, system_id: id }))
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

    if (!findMerchant || !findMerchant.swichMerchantId) {
      throw new CustomError("Merchant not found", 404);
    }

    let id2 = payload.order_id || id;
    let data = JSON.stringify({
      customerTransactionId: id2,
      categoryId: "2",
      channelId: payload.channel == 5624 ? 10 : 8,
      item: "1",
      amount: payload.amount,
      remoteIPAddress: "139.59.40.220",
      msisdn: payload.phone,
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

    let commission;
    if (findMerchant.commissions[0].commissionMode == "SINGLE") {
      commission = +findMerchant.commissions[0].commissionGST +
        +findMerchant.commissions[0].commissionRate +
        +findMerchant.commissions[0].commissionWithHoldingTax
    }
    else {
      commission = +findMerchant.commissions[0].commissionGST +
        +(findMerchant.commissions[0]?.easypaisaRate || 0) +
        +findMerchant.commissions[0].commissionWithHoldingTax
    }
    saveTxn = await transactionService.createTxn({
      order_id: id2,
      transaction_id: id,
      amount: payload.amount,
      status: "pending",
      type: payload.type,
      merchant_id: findMerchant.merchant_id,
      commission,
      settlementDuration: findMerchant.commissions[0].settlementDuration,
      providerDetails: {
        id: findMerchant.swichMerchantId as number,
        name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
        msisdn: payload.phone,
      }
    });
    console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", order_id: payload.order_id, system_id: id }))


    let res = await axios.request(config);

    if (res.data.code === "0000") {
      console.log(JSON.stringify({ event: "SWICH_PAYIN_SUCCESS", order_id: payload.order_id, response: res.data, system_id: id }))
      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "completed",
          response_message: res.data.message,
          providerDetails: {
            id: findMerchant.swichMerchantId as number,
            name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
            msisdn: payload.phone,
            transactionId: res?.data?.orderId
          },
        },
        findMerchant.commissions[0].settlementDuration
      );
      transactionService.sendCallback(
        findMerchant.webhook_url as string,
        saveTxn,
        payload.phone,
        "payin",
        false,
        true
      );
      return {
        txnNo: saveTxn.merchant_transaction_id,
        txnDateTime: saveTxn.date_time,
        statusCode: res.data.code
      };
    } else {
      console.log(JSON.stringify({ event: "SWICH_PAYIN_FAILED", order_id: payload.order_id, response: res.data, system_id: id }))
      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "failed",
          response_message: res.data.message,
          providerDetails: {
            id: findMerchant.swichMerchantId as number,
            name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
            msisdn: payload.phone,
            transactionId: res?.data?.orderId
          },
        },
        findMerchant.commissions[0].settlementDuration
      );
      throw new CustomError(
        "An error occurred while initiating the transaction",
        500
      );
    }
  } catch (err: any) {
    console.log(JSON.stringify({
      event: "SWICH_PAYIN_ERROR", order_id: payload.order_id, system_id: id, error: {
        message: err?.message,
        response: err?.response?.data || null,
        statusCode: err?.statusCode || err?.response?.status || null,
      }
    }))
    if (saveTxn && saveTxn.transaction_id) {
      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "failed",
          response_message: err?.response?.data?.message,
          providerDetails: {
            name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
            msisdn: payload.phone,
            transactionId: err?.response?.data?.orderId
          }
        },
        findMerchant?.commissions[0]?.settlementDuration as number
      );
      return {
        message: err?.message || "An error occurred while initiating the transaction",
        statusCode: err?.statusCode || 500,
        txnNo: saveTxn?.merchant_transaction_id
      }
    }
    else {
      return {
        message: err?.message || "An error occurred while initiating the transaction",
        statusCode: err?.statusCode || 500,
        txnNo: saveTxn?.merchant_transaction_id
      }
    }
  }
};

const initiateSwichClone = async (payload: any, merchantId: string) => {
  let saveTxn, findMerchant;
  let id = transactionService.createTransactionId();
  try {
    console.log(JSON.stringify({ event: "SWICH_PAYIN_INITIATED", order_id: payload.order_id, system_id: id }))
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

    if (!findMerchant || !findMerchant.swichMerchantId) {
      throw new CustomError("Merchant not found", 404);
    }

    let id2 = payload.order_id || id;
    let data = JSON.stringify({
      customerTransactionId: id2,
      categoryId: "2",
      channelId: payload.channel == 5624 ? 10 : 8,
      item: "1",
      amount: payload.amount,
      remoteIPAddress: "139.59.40.220",
      msisdn: payload.phone,
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

    let commission;
    if (findMerchant.commissions[0].commissionMode == "SINGLE") {
      commission = +findMerchant.commissions[0].commissionGST +
        +findMerchant.commissions[0].commissionRate +
        +findMerchant.commissions[0].commissionWithHoldingTax
    }
    else {
      commission = +findMerchant.commissions[0].commissionGST +
        +(findMerchant.commissions[0]?.easypaisaRate || 0) +
        +findMerchant.commissions[0].commissionWithHoldingTax
    }
    saveTxn = await transactionService.createTxn({
      order_id: id2,
      transaction_id: id,
      amount: payload.amount,
      status: "pending",
      type: payload.type,
      merchant_id: findMerchant.merchant_id,
      commission,
      settlementDuration: findMerchant.commissions[0].settlementDuration,
      providerDetails: {
        id: findMerchant.swichMerchantId as number,
        name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
        msisdn: payload.phone,
      }
    });
    console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", order_id: payload.order_id, system_id: id }))


    let res = await axios.request(config);

    if (res.data.code === "0000") {
      console.log(JSON.stringify({ event: "SWICH_PAYIN_SUCCESS", order_id: payload.order_id, response: res.data, system_id: id }))
      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "completed",
          response_message: res.data.message,
          providerDetails: {
            id: findMerchant.swichMerchantId as number,
            name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
            msisdn: payload.phone,
            transactionId: res?.data?.orderId
          },
        },
        findMerchant.commissions[0].settlementDuration
      );
      transactionService.sendCallback(
        findMerchant.webhook_url as string,
        saveTxn,
        payload.phone,
        "payin",
        false,
        true
      );
      return {
        txnNo: saveTxn.merchant_transaction_id,
        txnDateTime: saveTxn.date_time,
        statusCode: res.data.code
      };
    } else {
      console.log(JSON.stringify({ event: "SWICH_PAYIN_FAILED", order_id: payload.order_id, response: res.data, system_id: id }))
      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "failed",
          response_message: res.data.message,
          providerDetails: {
            id: findMerchant.swichMerchantId as number,
            name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
            msisdn: payload.phone,
            transactionId: res?.data?.orderId
          },
        },
        findMerchant.commissions[0].settlementDuration
      );
      throw new CustomError(
        "An error occurred while initiating the transaction",
        500
      );
    }
  } catch (err: any) {
    console.log(JSON.stringify({
      event: "SWICH_PAYIN_ERROR", order_id: payload.order_id, system_id: id, error: {
        message: err?.message,
        response: err?.response?.data || null,
        statusCode: err?.statusCode || err?.response?.status || null,
      }
    }))
    if (saveTxn && saveTxn.transaction_id) {
      const updateTxn = await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "failed",
          response_message: err?.response?.data?.message,
          providerDetails: {
            name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
            msisdn: payload.phone,
          }
        },
        findMerchant?.commissions[0]?.settlementDuration as number
      );
      return {
        message: err?.message || "An error occurred while initiating the transaction",
        statusCode: err?.statusCode || 500,
        txnNo: saveTxn?.merchant_transaction_id
      }
    }
    else {
      return {
        message: err?.message || "An error occurred while initiating the transaction",
        statusCode: err?.statusCode || 500,
        txnNo: saveTxn?.merchant_transaction_id
      }
    }
  }
};

const initiateSwichAsync = async (payload: any, merchantId: string) => {
  let saveTxn: Awaited<ReturnType<typeof transactionService.createTxn>> | undefined;
  let findMerchant: any;
  const id = transactionService.createTransactionId();

  try {
    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }

    // Fetch the merchant details
    findMerchant = await prisma.merchant.findFirst({
      where: {
        uid: merchantId,
      },
      include: {
        commissions: true,
      },
    });

    console.log("Swich ID: ", findMerchant)

    if (!findMerchant || !findMerchant.swichMerchantId) {
      throw new CustomError("Merchant not found", 404);
    }

    const id2 = payload.order_id || id;
    console.log(+findMerchant.commissions[0].commissionGST +
      +(findMerchant.commissions[0]?.easypaisaRate || 0) +
      +findMerchant.commissions[0].commissionWithHoldingTax)
    let commission;
    if (findMerchant.commissions[0].commissionMode == "SINGLE") {
      commission = +findMerchant.commissions[0].commissionGST +
        +findMerchant.commissions[0].commissionRate +
        +findMerchant.commissions[0].commissionWithHoldingTax
    }
    else {
      commission = +findMerchant.commissions[0].commissionGST +
        +(findMerchant.commissions[0]?.easypaisaRate || 0) +
        +findMerchant.commissions[0].commissionWithHoldingTax
    }
    console.log(commission)
    // Save transaction immediately with pending status
    saveTxn = await transactionService.createTxn({
      order_id: id2,
      transaction_id: id,
      amount: payload.amount,
      status: "pending",
      type: payload.type,
      merchant_id: findMerchant.merchant_id,
      commission,
      settlementDuration: findMerchant.commissions[0].settlementDuration,
      providerDetails: {
        id: findMerchant.swichMerchantId as number,
        name: payload.channel === 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
        msisdn: payload.phone,
      },
    });

    // Return pending status and transaction ID immediately
    setImmediate(async () => {
      try {
        // Prepare the payload for the external API
        const data = JSON.stringify({
          customerTransactionId: id2,
          categoryId: "2",
          channelId: payload.channel === 5624 ? 10 : 8,
          item: "1",
          amount: payload.amount,
          remoteIPAddress: "139.59.40.220",
          msisdn: payload.phone,
          email: payload.email,
        });

        // Fetch the auth token
        const authToken = await getAuthToken(
          findMerchant.swichMerchantId as number
        );

        // API config
        const config = {
          method: "post",
          maxBodyLength: Infinity,
          url: "https://api.swichnow.com/gateway/payin/purchase/ewallet",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          data: data,
        };

        // Make the API call
        const res = await axios.request(config);

        // Process API response
        if (res.data.code === "0000") {
          console.log(JSON.stringify({event: "SWICH_ASYNC_SUCCESS", order_id: payload.order_id, system_id: id, response: res.data}))
          await transactionService.updateTxn(
            saveTxn?.transaction_id as string,
            {
              status: "completed",
              response_message: res.data.message,
              providerDetails: {
                id: findMerchant.swichMerchantId as number,
                name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
                msisdn: payload.phone,
                transactionId: res?.data?.orderId
              },
            },
            findMerchant.commissions[0].settlementDuration
          );

          transactionService.sendCallback(
            findMerchant.webhook_url as string,
            saveTxn,
            payload.phone,
            "payin",
            true,
            true
          );
        } else {
          console.log(JSON.stringify({event: "SWICH_ASYNC_FAILED", order_id: payload.order_id, system_id: id, response: res.data}))
          await transactionService.updateTxn(
            saveTxn?.transaction_id as string,
            {
              status: "failed",
              response_message: res.data.message,
              providerDetails: {
                id: findMerchant.swichMerchantId as number,
                name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
                msisdn: payload.phone,
                transactionId: res?.data?.orderId
              },
            },
            findMerchant.commissions[0].settlementDuration
          );
        }
      } catch (error: any) {
        console.log(JSON.stringify({event: "SWICH_ASYNC_SUCCESS", order_id: payload.order_id, system_id: id, error: {
          message: error?.message,
          response: error?.response?.data || null,
          statusCode: error?.statusCode || error?.response?.status || null,
        }}))

        if (saveTxn) {
          await transactionService.updateTxn(
            saveTxn.transaction_id,
            {
              status: "failed",
              response_message: error?.response?.data?.message || error.message,
              providerDetails: {
                id: findMerchant.swichMerchantId as number,
                name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
                msisdn: payload.phone,
                transactionId: error?.response?.data?.orderId
              },
            },
            findMerchant?.commissions[0]?.settlementDuration || 0
          );
        }
      }
    });

    return {
      txnNo: saveTxn.merchant_transaction_id,
      txnDateTime: saveTxn.date_time,
      statusCode: "pending",
    };
  } catch (err: any) {
    console.log(JSON.stringify({event: "SWICH_ASYNC_SUCCESS", order_id: payload.order_id, system_id: id, error: {
      message: err?.message,
      response: err?.response?.data || null,
      statusCode: err?.statusCode || err?.response?.status || null,
    }}))

    if (saveTxn) {
      await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "failed",
          response_message: err?.response?.data?.message || err.message,
          providerDetails: {
            id: findMerchant.swichMerchantId as number,
            name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
            msisdn: payload.phone,
            transactionId: err?.response?.data?.orderId
          },

        },
        findMerchant?.commissions[0]?.settlementDuration || 0
      );
    }

    return {
      message: err?.message || "An error occurred while initiating the transaction",
      statusCode: err?.statusCode || 500,
      txnNo: saveTxn?.merchant_transaction_id || null,
    };
  }
};

const initiateSwichAsyncClone = async (payload: any, merchantId: string) => {
  let saveTxn: Awaited<ReturnType<typeof transactionService.createTxn>> | undefined;
  let findMerchant: any;
  const id = transactionService.createTransactionId();

  try {
    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }

    // Fetch the merchant details
    findMerchant = await prisma.merchant.findFirst({
      where: {
        uid: merchantId,
      },
      include: {
        commissions: true,
      },
    });

    console.log("Swich ID: ", findMerchant)

    if (!findMerchant || !findMerchant.swichMerchantId) {
      throw new CustomError("Merchant not found", 404);
    }

    const id2 = payload.order_id || id;
    console.log(+findMerchant.commissions[0].commissionGST +
      +(findMerchant.commissions[0]?.easypaisaRate || 0) +
      +findMerchant.commissions[0].commissionWithHoldingTax)
    let commission;
    if (findMerchant.commissions[0].commissionMode == "SINGLE") {
      commission = +findMerchant.commissions[0].commissionGST +
        +findMerchant.commissions[0].commissionRate +
        +findMerchant.commissions[0].commissionWithHoldingTax
    }
    else {
      commission = +findMerchant.commissions[0].commissionGST +
        +(findMerchant.commissions[0]?.easypaisaRate || 0) +
        +findMerchant.commissions[0].commissionWithHoldingTax
    }
    console.log(commission)
    // Save transaction immediately with pending status
    saveTxn = await transactionService.createTxn({
      order_id: id2,
      transaction_id: id,
      amount: payload.amount,
      status: "pending",
      type: payload.type,
      merchant_id: findMerchant.merchant_id,
      commission,
      settlementDuration: findMerchant.commissions[0].settlementDuration,
      providerDetails: {
        id: findMerchant.swichMerchantId as number,
        name: payload.channel === 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
        msisdn: payload.phone,
      },
    });

    // Return pending status and transaction ID immediately
    setImmediate(async () => {
      try {
        // Prepare the payload for the external API
        const data = JSON.stringify({
          customerTransactionId: id2,
          categoryId: "2",
          channelId: payload.channel === 5624 ? 10 : 8,
          item: "1",
          amount: payload.amount,
          remoteIPAddress: "139.59.40.220",
          msisdn: payload.phone,
          email: payload.email,
        });

        // Fetch the auth token
        const authToken = await getAuthToken(
          findMerchant.swichMerchantId as number
        );

        // API config
        const config = {
          method: "post",
          maxBodyLength: Infinity,
          url: "https://api.swichnow.com/gateway/payin/purchase/ewallet",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          data: data,
        };

        // Make the API call
        const res = await axios.request(config);

        // Process API response
        if (res.data.code === "0000") {
          console.log(JSON.stringify({event: "SWICH_ASYNC_SUCCESS", order_id: payload.order_id, system_id: id, response: res.data}))
          await transactionService.updateTxn(
            saveTxn?.transaction_id as string,
            {
              status: "completed",
              response_message: res.data.message,
              providerDetails: {
                id: findMerchant.swichMerchantId as number,
                name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
                msisdn: payload.phone,
                transactionId: res?.data?.orderId
              },
            },
            findMerchant.commissions[0].settlementDuration
          );

          transactionService.sendCallback(
            findMerchant.webhook_url as string,
            saveTxn,
            payload.phone,
            "payin",
            true,
            true
          );
        } else {
          console.log(JSON.stringify({event: "SWICH_ASYNC_FAILED", order_id: payload.order_id, system_id: id, response: res.data}))
          await transactionService.updateTxn(
            saveTxn?.transaction_id as string,
            {
              status: "failed",
              response_message: res.data.message,
              providerDetails: {
                id: findMerchant.swichMerchantId as number,
                name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
                msisdn: payload.phone,
                transactionId: res?.data?.orderId
              },
            },
            findMerchant.commissions[0].settlementDuration
          );
        }
      } catch (error: any) {
        console.log(JSON.stringify({event: "SWICH_ASYNC_SUCCESS", order_id: payload.order_id, system_id: id, error: {
          message: error?.message,
          response: error?.response?.data || null,
          statusCode: error?.statusCode || error?.response?.status || null,
        }}))

        if (saveTxn) {
          await transactionService.updateTxn(
            saveTxn.transaction_id,
            {
              status: "failed",
              response_message: error?.response?.data?.message || error.message,
              providerDetails: {
                id: findMerchant.swichMerchantId as number,
                name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
                msisdn: payload.phone,
              },
            },
            findMerchant?.commissions[0]?.settlementDuration || 0
          );
        }
      }
    });

    return {
      txnNo: saveTxn.merchant_transaction_id,
      txnDateTime: saveTxn.date_time,
      statusCode: "pending",
    };
  } catch (err: any) {
    console.log(JSON.stringify({event: "SWICH_ASYNC_SUCCESS", order_id: payload.order_id, system_id: id, error: {
      message: err?.message,
      response: err?.response?.data || null,
      statusCode: err?.statusCode || err?.response?.status || null,
    }}))

    if (saveTxn) {
      await transactionService.updateTxn(
        saveTxn.transaction_id,
        {
          status: "failed",
          response_message: err?.response?.data?.message || err.message,
          providerDetails: {
            id: findMerchant.swichMerchantId as number,
            name: payload.channel == 5649 ? PROVIDERS.JAZZ_CASH : PROVIDERS.EASYPAISA,
            msisdn: payload.phone,
          },

        },
        findMerchant?.commissions[0]?.settlementDuration || 0
      );
    }

    return {
      message: err?.message || "An error occurred while initiating the transaction",
      statusCode: err?.statusCode || 500,
      txnNo: saveTxn?.merchant_transaction_id || null,
    };
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
          clientId: encrypt(merchantData.clientId) as string,
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
      obj["clientId"] = decrypt(obj["clientId"]) as string;
      obj["clientSecret"] = decrypt(obj["clientSecret"] as string) as string;
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
          ClientId: clientId,
          CustomerTransactionId: transactionId,
          RemoteIPAddress: "139.59.40.220",
        },
      })
      .catch((err) => {
        return err.response.data;
      });
    console.log(txnInquiry)
    if (!txnInquiry.transaction) {
      return {
        message: "Transaction Not Found",
        statusCode: 500
      }
    }
    // orderId, transactionStatus, transactionAmount / amount, transactionDateTime / createdDateTime, msisdn, responseDesc/ transactionStatus, responseMode: "MA"
    return {
      "orderId": txnInquiry.transaction?.transaction_id,
      "transactionStatus": txnInquiry.transaction?.transactionStatus,
      "transactionAmount": txnInquiry.transaction?.amount,
      "transactionDateTime": txnInquiry.transaction?.createdDateTime,
      "msisdn": txnInquiry.transaction?.msisdn,
      "responseDesc": txnInquiry.transaction?.transactionStatus,
      "responseMode": "MA",
      statusCode: 201
    };
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
  initiateSwichAsync,
  initiateSwichClone,
  initiateSwichAsyncClone
};
