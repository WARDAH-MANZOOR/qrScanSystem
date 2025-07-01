import dotenv from "dotenv";
import axios from "axios";
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
import { backofficeService, easyPaisaService, transactionService } from "../../services/index.js";
import { PROVIDERS } from "../../constants/providers.js";
import RSAEncryption from "../../utils/RSAEncryption.js";
import { merchantService } from "../../services/index.js";
import { calculateDisbursement, getEligibleTransactions, getMerchantRate, getWalletBalance, updateTransactions, } from "./disbursement.js";
import { easyPaisaDisburse } from "../../services/index.js";
import { Decimal } from "@prisma/client/runtime/library";
import bankDetails from "../../data/banks.json" with { type: 'json' };
import { parse, parseISO, subMinutes } from "date-fns";
import { format, toZonedTime } from "date-fns-tz";
import { Parser } from "json2csv";
import path, { dirname } from "path";
import { createObjectCsvWriter } from "csv-writer";
import { fileURLToPath } from "url";
import { Prisma } from "@prisma/client";
dotenv.config();
function stringToBoolean(value) {
    return value.toLowerCase() === "true";
}
const getMerchantChannel = async (merchantId) => {
    return await prisma.merchant.findFirst({
        where: {
            uid: merchantId
        },
        select: {
            easypaisaPaymentMethod: true
        }
    });
};
const getMerchantInquiryMethod = async (merchantId) => {
    return await prisma.merchant.findFirst({
        where: {
            uid: merchantId
        },
        select: {
            easypaisaInquiryMethod: true
        }
    });
};
const getTransaction = async (merchantId, transactionId) => {
    try {
        const id = await prisma.merchant.findFirst({
            where: {
                uid: merchantId,
            },
            select: {
                merchant_id: true
            }
        });
        if (!id) {
            throw new CustomError("Merchant Not Found", 400);
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
        });
        if (!txn) {
            return {
                message: "Transaction not found",
                statusCode: 500
            };
        }
        // orderId, transactionStatus, transactionAmount / amount, transactionDateTime / createdDateTime, msisdn, responseDesc/ transactionStatus, responseMode: "MA"
        let data = {
            "orderId": txn?.merchant_transaction_id,
            "transactionStatus": txn?.status,
            "transactionAmount": txn?.original_amount,
            "transactionDateTime": txn?.date_time,
            "msisdn": txn?.providerDetails?.msisdn,
            "responseDesc": txn?.response_message,
            "responseMode": "MA",
            "statusCode": 201
        };
        return data;
    }
    catch (err) {
        throw new CustomError(err?.message || "Error getting transaction", 500);
    }
};
const initiateEasyPaisa = async (merchantId, params) => {
    let saveTxn;
    let id = transactionService.createTransactionId();
    try {
        console.log(JSON.stringify({ event: "EASYPAISA_PAYIN_INITIATED", order_id: params.order_id, system_id: id, body: params }));
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
        if (!findMerchant || !findMerchant.easyPaisaMerchantId) {
            throw new CustomError("Merchant not found", 404);
        }
        const easyPaisaMerchant = await prisma.easyPaisaMerchant.findMany({
            where: {
                id: findMerchant.easyPaisaMerchantId,
            },
        });
        if (!easyPaisaMerchant) {
            throw new CustomError("Gateway merchant not found", 404);
        }
        const phone = transactionService.convertPhoneNumber(params.phone);
        let id2 = params.order_id || id;
        const easyPaisaTxPayload = {
            orderId: id2,
            storeId: easyPaisaMerchant[0].storeId,
            transactionAmount: params.amount,
            transactionType: "MA",
            mobileAccountNo: phone,
            emailAddress: params.email,
        };
        console.log(`${easyPaisaMerchant[0].username}:${easyPaisaMerchant[0].credentials}`);
        const base64Credentials = Buffer.from(`${easyPaisaMerchant[0].username}:${easyPaisaMerchant[0].credentials}`).toString("base64");
        let data = JSON.stringify(easyPaisaTxPayload);
        let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initiate-ma-transaction/",
            headers: {
                Credentials: `${base64Credentials}`,
                "Content-Type": "application/json",
            },
            data: data,
        };
        let commission;
        if (findMerchant.commissions[0].commissionMode == "SINGLE") {
            commission = +findMerchant.commissions[0].commissionGST +
                +findMerchant.commissions[0].commissionRate +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        else {
            commission = +findMerchant.commissions[0].commissionGST +
                +(findMerchant.commissions[0]?.easypaisaRate ?? 0) +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        saveTxn = await transactionService.createTxn({
            order_id: id2,
            transaction_id: id,
            amount: params.amount,
            status: "pending",
            type: params.type,
            merchant_id: findMerchant.merchant_id,
            commission,
            settlementDuration: findMerchant.commissions[0].settlementDuration,
            providerDetails: {
                id: easyPaisaMerchant[0].id,
                name: PROVIDERS.EASYPAISA,
                msisdn: phone
            },
        });
        console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", order_id: params.order_id, system_id: id }));
        // console.log("saveTxn", saveTxn);
        const response = await axios.request(config);
        console.log("response: ", response.data);
        // console.log("🚀 ~ initiateEasyPaisa ~ response:", response.data);
        if (response?.data.responseCode == "0000") {
            console.log(JSON.stringify({ event: "EASYPAISA_PAYIN_SUCCESS", order_id: params.order_id, system_id: id, response: response?.data }));
            const updateTxn = await transactionService.updateTxn(saveTxn.transaction_id, {
                status: "completed",
                response_message: response.data.responseDesc,
                providerDetails: {
                    id: easyPaisaMerchant[0].id,
                    name: PROVIDERS.EASYPAISA,
                    msisdn: phone,
                    transactionId: response?.data?.transactionId
                },
            }, findMerchant.commissions[0].settlementDuration);
            transactionService.sendCallback(findMerchant.webhook_url, saveTxn, phone, "payin", findMerchant.encrypted == "True" ? true : false, true);
            console.log(JSON.stringify({
                event: "EASYPAISA_PAYIN_RESPONSE", order_id: params.order_id, system_id: id, response: {
                    txnNo: saveTxn.merchant_transaction_id,
                    txnDateTime: saveTxn.date_time,
                    statusCode: response?.data.responseCode
                }
            }));
            return {
                txnNo: saveTxn.merchant_transaction_id,
                txnDateTime: saveTxn.date_time,
                statusCode: response?.data.responseCode
            };
        }
        else {
            console.log(JSON.stringify({ event: "EASYPAISA_PAYIN_FAILED", order_id: params.order_id, system_id: id, response: response?.data }));
            const updateTxn = await transactionService.updateTxn(saveTxn.transaction_id, {
                status: "failed",
                response_message: response.data?.responseDesc == "SYSTEM ERROR" ? "User did not respond" : response.data?.responseDesc,
                providerDetails: {
                    id: easyPaisaMerchant[0].id,
                    name: PROVIDERS.EASYPAISA,
                    msisdn: phone,
                    transactionId: response?.data?.transactionId
                },
            }, findMerchant.commissions[0].settlementDuration);
            throw new CustomError(response.data?.responseDesc == "SYSTEM ERROR" ? "User did not respond" : response.data?.responseDesc, 500);
        }
    }
    catch (error) {
        console.log(JSON.stringify({
            event: "EASYPAISA_PAYIN_ERROR", order_id: params.order_id, system_id: id, error: {
                message: error?.message,
                response: error?.response?.data || null,
                statusCode: error?.statusCode || error?.response?.status || null,
            }
        }));
        return {
            message: error?.message || "An error occurred while initiating the transaction",
            statusCode: error?.statusCode || 500,
            txnNo: saveTxn?.merchant_transaction_id
        };
    }
};
const initiateEasyPaisaClone = async (merchantId, params) => {
    let saveTxn;
    let id = transactionService.createTransactionId();
    try {
        console.log(JSON.stringify({ event: "EASYPAISA_PAYIN_INITIATED", order_id: params.order_id, system_id: id }));
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
        if (!findMerchant || !findMerchant.easyPaisaMerchantId) {
            throw new CustomError("Merchant not found", 404);
        }
        const easyPaisaMerchant = await prisma.easyPaisaMerchant.findMany({
            where: {
                id: findMerchant.easyPaisaMerchantId,
            },
        });
        if (!easyPaisaMerchant) {
            throw new CustomError("Gateway merchant not found", 404);
        }
        const phone = transactionService.convertPhoneNumber(params.phone);
        let id2 = params.order_id || id;
        const easyPaisaTxPayload = {
            orderId: id2,
            storeId: easyPaisaMerchant[0].storeId,
            transactionAmount: params.amount,
            transactionType: "MA",
            mobileAccountNo: phone,
            emailAddress: params.email,
        };
        console.log(`${easyPaisaMerchant[0].username}:${easyPaisaMerchant[0].credentials}`);
        const base64Credentials = Buffer.from(`${easyPaisaMerchant[0].username}:${easyPaisaMerchant[0].credentials}`).toString("base64");
        let data = JSON.stringify(easyPaisaTxPayload);
        let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initiate-ma-transaction/",
            headers: {
                Credentials: `${base64Credentials}`,
                "Content-Type": "application/json",
            },
            data: data,
        };
        let commission;
        if (findMerchant.commissions[0].commissionMode == "SINGLE") {
            commission = +findMerchant.commissions[0].commissionGST +
                +findMerchant.commissions[0].commissionRate +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        else {
            commission = +findMerchant.commissions[0].commissionGST +
                +(findMerchant.commissions[0]?.easypaisaRate ?? 0) +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        saveTxn = await transactionService.createTxn({
            order_id: id2,
            transaction_id: id,
            amount: params.amount,
            status: "pending",
            type: params.type,
            merchant_id: findMerchant.merchant_id,
            commission,
            settlementDuration: findMerchant.commissions[0].settlementDuration,
            providerDetails: {
                id: easyPaisaMerchant[0].id,
                name: PROVIDERS.EASYPAISA,
                msisdn: phone
            },
        });
        console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", order_id: params.order_id, system_id: id }));
        // console.log("saveTxn", saveTxn);
        const response = await axios.request(config);
        console.log("response: ", response.data);
        // console.log("🚀 ~ initiateEasyPaisa ~ response:", response.data);
        if (response?.data.responseCode == "0000") {
            console.log(JSON.stringify({ event: "EASYPAISA_PAYIN_SUCCESS", order_id: params.order_id, system_id: id, response: response?.data }));
            const updateTxn = await transactionService.updateTxn(saveTxn.transaction_id, {
                status: "completed",
                response_message: response.data.responseDesc,
                providerDetails: {
                    id: easyPaisaMerchant[0].id,
                    name: PROVIDERS.EASYPAISA,
                    msisdn: phone,
                    transactionId: response?.data?.transactionId
                },
            }, findMerchant.commissions[0].settlementDuration);
            transactionService.sendCallback(findMerchant.webhook_url, saveTxn, phone, "payin", findMerchant.encrypted == "True" ? true : false, true);
            return {
                txnNo: saveTxn.merchant_transaction_id,
                txnDateTime: saveTxn.date_time,
                statusCode: response?.data.responseCode
            };
        }
        else {
            console.log(JSON.stringify({ event: "EASYPAISA_PAYIN_FAILED", order_id: params.order_id, system_id: id, response: response?.data }));
            const updateTxn = await transactionService.updateTxn(saveTxn.transaction_id, {
                status: "failed",
                response_message: response.data?.responseDesc == "SYSTEM ERROR" ? "User did not respond" : response.data?.responseDesc,
                providerDetails: {
                    id: easyPaisaMerchant[0].id,
                    name: PROVIDERS.EASYPAISA,
                    msisdn: phone,
                    transactionId: response?.data?.transactionId
                },
            }, findMerchant.commissions[0].settlementDuration);
            throw new CustomError(response.data?.responseDesc == "SYSTEM ERROR" ? "User did not respond" : response.data?.responseDesc, 500);
        }
    }
    catch (error) {
        console.log(JSON.stringify({
            event: "EASYPAISA_PAYIN_ERROR", order_id: params.order_id, system_id: id, error: {
                message: error?.message,
                response: error?.response?.data || null,
                statusCode: error?.statusCode || error?.response?.status || null,
            }
        }));
        return {
            message: error?.message || "An error occurred while initiating the transaction",
            statusCode: error?.statusCode || 500,
            txnNo: saveTxn?.merchant_transaction_id
        };
    }
};
const initiateEasyPaisaAsync = async (merchantId, params) => {
    let saveTxn;
    let id = transactionService.createTransactionId();
    try {
        console.log(JSON.stringify({ event: "EASYPAISA_ASYNC_INITIATED", order_id: params.order_id, system_id: id, body: params }));
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
        if (!findMerchant || !findMerchant.easyPaisaMerchantId) {
            throw new CustomError("Merchant not found", 404);
        }
        const easyPaisaMerchant = await prisma.easyPaisaMerchant.findFirst({
            where: {
                id: findMerchant.easyPaisaMerchantId,
            },
        });
        if (!easyPaisaMerchant) {
            throw new CustomError("Gateway merchant not found", 404);
        }
        const phone = transactionService.convertPhoneNumber(params.phone);
        let id2 = params.order_id || id;
        const easyPaisaTxPayload = {
            orderId: id2,
            storeId: easyPaisaMerchant.storeId,
            transactionAmount: params.amount,
            transactionType: "MA",
            mobileAccountNo: phone,
            emailAddress: params.email,
        };
        const base64Credentials = Buffer.from(`${easyPaisaMerchant.username}:${easyPaisaMerchant.credentials}`).toString("base64");
        let data = JSON.stringify(easyPaisaTxPayload);
        let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initiate-ma-transaction/",
            headers: {
                Credentials: `${base64Credentials}`,
                "Content-Type": "application/json",
            },
            data: data,
        };
        // Save transaction immediately with "pending" status
        let commission;
        if (findMerchant.commissions[0].commissionMode == "SINGLE") {
            commission = +findMerchant.commissions[0].commissionGST +
                +findMerchant.commissions[0].commissionRate +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        else {
            commission = +findMerchant.commissions[0].commissionGST +
                +(findMerchant.commissions[0]?.easypaisaRate ?? 0) +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        saveTxn = await transactionService.createTxn({
            order_id: id2,
            transaction_id: id,
            amount: params.amount,
            status: "pending",
            type: params.type,
            merchant_id: findMerchant.merchant_id,
            commission,
            settlementDuration: findMerchant.commissions[0].settlementDuration,
            providerDetails: {
                id: easyPaisaMerchant.id,
                name: PROVIDERS.EASYPAISA,
                msisdn: phone,
            },
        });
        console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", system_id: id, order_id: params.order_id }));
        // Return pending status and transaction ID immediately
        setImmediate(async () => {
            try {
                const response = await axios.request(config);
                if (response?.data.responseCode === "0000") {
                    console.log(JSON.stringify({ event: "EASYPAISA_ASYNC_SUCCESS", order_id: params.order_id, system_id: id, response: response?.data }));
                    await transactionService.updateTxn(saveTxn?.transaction_id, {
                        status: "completed",
                        response_message: response.data.responseDesc,
                        providerDetails: {
                            id: easyPaisaMerchant.id,
                            name: PROVIDERS.EASYPAISA,
                            msisdn: phone,
                            transactionId: response?.data?.transactionId
                        },
                    }, findMerchant.commissions[0].settlementDuration);
                    transactionService.sendCallback(findMerchant.webhook_url, saveTxn, phone, "payin", findMerchant?.encrypted?.toLowerCase() == "true" ? true : false, true);
                }
                else {
                    console.log(JSON.stringify({ event: "EASYPAISA_ASYNC_FAILED", order_id: params.order_id, system_id: id, response: response?.data }));
                    await transactionService.updateTxn(saveTxn?.transaction_id, {
                        status: "failed",
                        response_message: response.data?.responseDesc == "SYSTEM ERROR" ? "User did not respond" : response.data?.responseDesc,
                        providerDetails: {
                            id: easyPaisaMerchant.id,
                            name: PROVIDERS.EASYPAISA,
                            msisdn: phone,
                            transactionId: response?.data?.transactionId
                        },
                    }, findMerchant.commissions[0].settlementDuration);
                    throw new CustomError(response.data?.responseDesc == "SYSTEM ERROR" ? "User did not respond" : response.data?.responseDesc, 500);
                }
            }
            catch (error) {
                console.log(JSON.stringify({
                    event: "EASYPAISA_PAYIN_ERROR", order_id: params.order_id, system_id: id, error: {
                        message: error?.message,
                        response: error?.response?.data || null,
                        statusCode: error?.statusCode || error?.response?.status || null,
                    }
                }));
                await transactionService.updateTxn(saveTxn?.transaction_id, {
                    status: "failed",
                    response_message: error.message,
                    providerDetails: {
                        id: easyPaisaMerchant.id,
                        name: PROVIDERS.EASYPAISA,
                        msisdn: phone,
                        transactionId: error?.response?.data?.transactionId
                    },
                }, findMerchant.commissions[0].settlementDuration);
            }
        });
        console.log(JSON.stringify({
            event: "EASYPAISA_ASYNC_RESPONSE", order_id: params.order_id, system_id: id, response: {
                txnNo: saveTxn.merchant_transaction_id,
                txnDateTime: saveTxn.date_time,
                statusCode: "pending",
            }
        }));
        return {
            txnNo: saveTxn.merchant_transaction_id,
            txnDateTime: saveTxn.date_time,
            statusCode: "pending",
        };
    }
    catch (error) {
        return {
            message: error?.message || "An error occurred while initiating the transaction",
            statusCode: error?.statusCode || 500,
            txnNo: saveTxn?.merchant_transaction_id || null,
        };
    }
};
const initiateEasyPaisaAsyncClone = async (merchantId, params) => {
    let saveTxn;
    let id = transactionService.createTransactionId();
    try {
        console.log(JSON.stringify({ event: "EASYPAISA_ASYNC_INITIATED", order_id: params.order_id, system_id: id, body: params }));
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
        if (!findMerchant || !findMerchant.easyPaisaMerchantId) {
            throw new CustomError("Merchant not found", 404);
        }
        const easyPaisaMerchant = await prisma.easyPaisaMerchant.findFirst({
            where: {
                id: findMerchant.easyPaisaMerchantId,
            },
        });
        if (!easyPaisaMerchant) {
            throw new CustomError("Gateway merchant not found", 404);
        }
        const phone = transactionService.convertPhoneNumber(params.phone);
        let id2 = params.order_id || id;
        const easyPaisaTxPayload = {
            orderId: id2,
            storeId: easyPaisaMerchant.storeId,
            transactionAmount: params.amount,
            transactionType: "MA",
            mobileAccountNo: phone,
            emailAddress: params.email,
        };
        const base64Credentials = Buffer.from(`${easyPaisaMerchant.username}:${easyPaisaMerchant.credentials}`).toString("base64");
        let data = JSON.stringify(easyPaisaTxPayload);
        let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initiate-ma-transaction/",
            headers: {
                Credentials: `${base64Credentials}`,
                "Content-Type": "application/json",
            },
            data: data,
        };
        // Save transaction immediately with "pending" status
        let commission;
        if (findMerchant.commissions[0].commissionMode == "SINGLE") {
            commission = +findMerchant.commissions[0].commissionGST +
                +findMerchant.commissions[0].commissionRate +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        else {
            commission = +findMerchant.commissions[0].commissionGST +
                +(findMerchant.commissions[0]?.easypaisaRate ?? 0) +
                +findMerchant.commissions[0].commissionWithHoldingTax;
        }
        saveTxn = await transactionService.createTxn({
            order_id: id2,
            transaction_id: id,
            amount: params.amount,
            status: "pending",
            type: params.type,
            merchant_id: findMerchant.merchant_id,
            commission,
            settlementDuration: findMerchant.commissions[0].settlementDuration,
            providerDetails: {
                id: easyPaisaMerchant.id,
                name: PROVIDERS.EASYPAISA,
                msisdn: phone,
            },
        });
        console.log(JSON.stringify({ event: "PENDING_TXN_CREATED", system_id: id, order_id: params.order_id }));
        // Return pending status and transaction ID immediately
        setImmediate(async () => {
            try {
                const response = await axios.request(config);
                if (response?.data.responseCode === "0000") {
                    console.log(JSON.stringify({ event: "EASYPAISA_ASYNC_SUCCESS", order_id: params.order_id, system_id: id, response: response?.data }));
                    await transactionService.updateTxn(saveTxn?.transaction_id, {
                        status: "completed",
                        response_message: response.data.responseDesc,
                        providerDetails: {
                            id: easyPaisaMerchant.id,
                            name: PROVIDERS.EASYPAISA,
                            msisdn: phone,
                            transactionId: response?.data?.transactionId
                        },
                    }, findMerchant.commissions[0].settlementDuration);
                    transactionService.sendCallbackClone(findMerchant.webhook_url, saveTxn, phone, "payin", findMerchant?.encrypted?.toLowerCase() == "true" ? true : false, true);
                }
                else {
                    console.log(JSON.stringify({ event: "EASYPAISA_ASYNC_FAILED", order_id: params.order_id, system_id: id, response: response?.data }));
                    await transactionService.updateTxn(saveTxn?.transaction_id, {
                        status: "failed",
                        response_message: response.data.responseDesc,
                        providerDetails: {
                            id: easyPaisaMerchant.id,
                            name: PROVIDERS.EASYPAISA,
                            msisdn: phone,
                            transactionId: response?.data?.transactionId
                        },
                    }, findMerchant.commissions[0].settlementDuration);
                }
            }
            catch (error) {
                console.log(JSON.stringify({
                    event: "EASYPAISA_PAYIN_ERROR", order_id: params.order_id, system_id: id, error: {
                        message: error?.message,
                        response: error?.response?.data || null,
                        statusCode: error?.statusCode || error?.response?.status || null,
                    }
                }));
                await transactionService.updateTxn(saveTxn?.transaction_id, {
                    status: "failed",
                    response_message: error.message,
                    providerDetails: {
                        id: easyPaisaMerchant.id,
                        name: PROVIDERS.EASYPAISA,
                        msisdn: phone,
                    },
                }, findMerchant.commissions[0].settlementDuration);
            }
        });
        console.log(JSON.stringify({
            event: "EASYPAISA_ASYNC_RESPONSE", order_id: params.order_id, system_id: id, response: {
                txnNo: saveTxn.merchant_transaction_id,
                txnDateTime: saveTxn.date_time,
                statusCode: "pending",
            }
        }));
        return {
            txnNo: saveTxn.merchant_transaction_id,
            txnDateTime: saveTxn.date_time,
            statusCode: "pending",
        };
    }
    catch (error) {
        return {
            message: error?.message || "An error occurred while initiating the transaction",
            statusCode: error?.statusCode || 500,
            txnNo: saveTxn?.merchant_transaction_id || null,
        };
    }
};
const createMerchant = async (merchantData) => {
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
            throw new CustomError("An error occurred while creating the merchant", 500);
        }
        return {
            message: "Merchant created successfully",
            data: easyPaisaMerchant,
        };
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred while creating the merchant", 500);
    }
};
const getMerchant = async (merchantId) => {
    try {
        const where = {};
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
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred while reading the merchant", 500);
    }
};
const updateMerchant = async (merchantId, updateData) => {
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
            throw new CustomError("An error occurred while updating the merchant", 500);
        }
        return {
            message: "Merchant updated successfully",
            data: updatedMerchant,
        };
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred while updating the merchant", 500);
    }
};
const deleteMerchant = async (merchantId) => {
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
            throw new CustomError("An error occurred while deleting the merchant", 500);
        }
        return {
            message: "Merchant deleted successfully",
        };
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred while deleting the merchant", 500);
    }
};
const easypaisainquiry = async (param, merchantId) => {
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
    const base64Credentials = Buffer.from(`${merchant?.easyPaisaMerchant?.username}:${merchant?.easyPaisaMerchant?.credentials}`).toString("base64");
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
    let res = await axios.request(config);
    console.log(res.data);
    if (res.data.responseCode == "0000") {
        if (res.data.transactionStatus == "PAID") {
            return {
                "orderId": res.data.orderId,
                "transactionStatus": res.data.transactionStatus == "PAID" ? "COMPLETED" : res.data.transactionStatus,
                "transactionAmount": res.data.transactionAmount,
                "transactionDateTime": res.data.transactionDateTime,
                "msisdn": res.data.msisdn,
                "responseDesc": res.data.responseDesc,
                "responseMode": "MA"
            };
        }
        else {
            return {
                "orderId": res.data.orderId,
                "transactionStatus": res.data.transactionStatus,
                "transactionAmount": res.data.transactionAmount,
                "transactionDateTime": res.data.transactionDateTime,
                "msisdn": res.data.msisdn,
                "responseDesc": res.data.errorCode,
                "responseMode": "MA"
            };
        }
    }
    else {
        return {
            message: "Transaction Not Found",
            statusCode: 500
        };
    }
};
const createRSAEncryptedPayload = async (url) => {
    const inputEnc = url;
    try {
        const publicKeyPath = "src/keys/publickey.pem";
        const publicKey = RSAEncryption.getPublicKey(publicKeyPath);
        const outputEnc = RSAEncryption.encrypt(inputEnc, publicKey);
        return outputEnc;
    }
    catch (error) {
        console.error("Error:", error);
    }
};
const corporateLogin = async (obj) => {
    try {
        return await axios
            .post("https://rgw.8798-f464fa20.eu-de.ri1.apiconnect.appdomain.cloud/tmfb/gateway/corporate-solution-corporate-login", {
            LoginPayload: await createRSAEncryptedPayload(`${obj.MSISDN}:${obj.pin}`),
        }, {
            headers: {
                "X-IBM-Client-Id": obj.clientId,
                "X-IBM-Client-Secret": obj.clientSecret,
                "X-Channel": obj.xChannel,
                "Content-Type": "application/json",
            },
        })
            .then((res) => {
            return res?.data;
        })
            .catch((error) => {
            console.error("Error:", error?.response?.data);
        });
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred while initiating the transaction", 500);
    }
};
const saveToCsv = async (record) => {
    // Define the path to save the CSV file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const csvFilePath = path.join(__dirname, 'records.csv');
    // Configure the CSV writer
    const csvWriter = createObjectCsvWriter({
        path: csvFilePath,
        header: [
            { id: 'id', title: 'ID' },
            { id: 'order_amount', title: 'Order Amount' },
            { id: 'balance', title: 'Balance' },
            { id: 'status', title: 'Status' },
        ],
        append: true,
    });
    try {
        // Write data to the CSV file
        await csvWriter.writeRecords([record]);
        console.log('CSV file created successfully at', csvFilePath);
    }
    catch (error) {
        console.error('Error writing to CSV file:', error);
    }
};
const createDisbursement = async (obj, merchantId) => {
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
        if (obj.order_id) {
            const checkOrder = await prisma.disbursement.findFirst({
                where: {
                    merchant_custom_order_id: obj.order_id,
                },
            });
            if (checkOrder) {
                throw new CustomError("Order ID already exists", 400);
            }
        }
        // find disbursement merchant
        const findDisbureMerch = await easyPaisaDisburse
            .getDisburseAccount(findMerchant.EasyPaisaDisburseAccountId)
            .then((res) => res?.data);
        if (!findDisbureMerch) {
            throw new CustomError("Disbursement account not found", 404);
        }
        // Phone number validation (must start with 92)
        if (!obj.phone.startsWith("92")) {
            throw new CustomError("Number should start with 92", 400);
        }
        let merchantAmount = new Decimal(0);
        let amountDecimal = new Decimal(0);
        let totalCommission = new Decimal(0);
        let totalGST = new Decimal(0);
        let totalWithholdingTax = new Decimal(0);
        let totalDisbursed = new Decimal(0);
        // Fetch merchant financial terms
        await prisma.$transaction(async (tx) => {
            let rate = await getMerchantRate(tx, findMerchant.merchant_id);
            const transactions = await getEligibleTransactions(findMerchant.merchant_id, tx);
            if (transactions.length === 0) {
                throw new CustomError("No eligible transactions to disburse", 400);
            }
            let updates = [];
            totalDisbursed = new Decimal(0);
            if (obj.amount) {
                amountDecimal = new Decimal(obj.amount);
            }
            else {
                updates = transactions.map((t) => ({
                    transaction_id: t.transaction_id,
                    disbursed: true,
                    balance: new Decimal(0),
                    settled_amount: t.settled_amount,
                    original_amount: t.original_amount,
                }));
                totalDisbursed = transactions.reduce((sum, t) => sum.plus(t.balance), new Decimal(0));
                amountDecimal = totalDisbursed;
            }
            // Calculate total deductions and merchant amount
            totalCommission = amountDecimal.mul(rate.disbursementRate);
            totalGST = amountDecimal.mul(rate.disbursementGST);
            totalWithholdingTax = amountDecimal.mul(rate.disbursementWithHoldingTax);
            const totalDeductions = totalCommission
                .plus(totalGST)
                .plus(totalWithholdingTax);
            merchantAmount = obj.amount
                ? amountDecimal.plus(totalDeductions)
                : amountDecimal.minus(totalDeductions);
            // Get eligible transactions
            if (obj.amount) {
                const result = calculateDisbursement(transactions, merchantAmount);
                updates = result.updates;
                totalDisbursed = totalDisbursed.plus(result.totalDisbursed);
            }
            await updateTransactions(updates, tx);
        }, {
            // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
            maxWait: 60000,
            timeout: 60000,
        });
        const getTimeStamp = await corporateLogin(findDisbureMerch);
        const creatHashKey = await createRSAEncryptedPayload(`${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`);
        const ma2ma = await axios
            .post("https://sea-turtle-app-bom3q.ondigitalocean.app/epd-ma", {
            Amount: obj.amount ? obj.amount : merchantAmount,
            MSISDN: findDisbureMerch.MSISDN,
            ReceiverMSISDN: obj.phone,
        }, {
            headers: {
                "X-Hash-Value": creatHashKey,
                "X-IBM-Client-Id": findDisbureMerch.clientId,
                "X-IBM-Client-Secret": findDisbureMerch.clientSecret,
                "X-Channel": findDisbureMerch.xChannel,
                accept: "application/json",
                "content-type": "application/json",
            },
        })
            .then((res) => res?.data)
            .catch((error) => {
            throw new CustomError(error?.response?.data?.ResponseMessage, 500);
        });
        let id = transactionService.createTransactionId();
        let data = {};
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
        const { walletBalance } = await getWalletBalance(findMerchant.merchant_id);
        console.log(walletBalance + +totalDisbursed);
        if (ma2ma.ResponseCode != 0) {
            console.log("Disbursement Failed ");
            console.log(totalDisbursed);
            await prisma.$transaction(async (tx) => {
                await backofficeService.adjustMerchantDisbursementWalletBalance(findMerchant.merchant_id, +totalDisbursed, false);
                await saveToCsv({
                    id: data.merchant_custom_order_id,
                    order_amount: obj.amount ? obj.amount : merchantAmount,
                    balance: totalDisbursed,
                    status: "failed"
                });
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
                console.log("Disbursement: ", txn);
                // return;
                throw new CustomError(ma2ma.ResponseMessage, 500);
            }, {
                // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
                maxWait: 60000,
                timeout: 60000,
            });
        }
        return await prisma.$transaction(async (tx) => {
            // Update transactions to adjust balances
            // Create disbursement record
            await saveToCsv({
                id: data.merchant_custom_order_id,
                order_amount: obj.amount ? obj.amount : merchantAmount,
                balance: walletBalance,
                status: "completed"
            });
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
            let webhook_url;
            if (findMerchant.callback_mode == "DOUBLE") {
                webhook_url = findMerchant.payout_callback;
            }
            else {
                webhook_url = findMerchant.webhook_url;
            }
            transactionService.sendCallback(webhook_url, {
                original_amount: obj.amount ? obj.amount : merchantAmount,
                date_time: zonedDate,
                merchant_transaction_id: disbursement.merchant_custom_order_id,
                merchant_id: findMerchant.merchant_id,
            }, obj.phone, "payout", stringToBoolean(findMerchant.encrypted), false);
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
        }, {
            // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
            maxWait: 60000,
            timeout: 60000,
        });
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred while initiating the transaction", 500);
    }
};
const updateDisbursement = async (obj, merchantId) => {
    let balanceDeducted = false;
    let findMerchant = null;
    let merchantAmount = new Decimal(+obj.merchantAmount + +obj.commission + +obj.gst + +obj.withholdingTax);
    try {
        // validate Merchant
        findMerchant = await merchantService.findOne({
            uid: merchantId,
        });
        if (!findMerchant) {
            throw new CustomError("Merchant not found", 404);
        }
        if (!findMerchant.EasyPaisaDisburseAccountId) {
            throw new CustomError("Disbursement account not assigned.", 404);
        }
        if (obj.order_id) {
            const checkOrder = await prisma.disbursement.findFirst({
                where: {
                    merchant_custom_order_id: obj.order_id,
                },
            });
            if (checkOrder) {
                throw new CustomError("Order ID already exists", 400);
            }
        }
        // find disbursement merchant
        const findDisbureMerch = await easyPaisaDisburse
            .getDisburseAccount(findMerchant.EasyPaisaDisburseAccountId)
            .then((res) => res?.data);
        if (!findDisbureMerch) {
            throw new CustomError("Disbursement account not found", 404);
        }
        // Phone number validation (must start with 92)
        if (!obj.account.startsWith("92")) {
            throw new CustomError("Number should start with 92", 400);
        }
        let amountDecimal = new Decimal(0);
        let totalDisbursed = new Decimal(obj.merchantAmount);
        await prisma.$transaction(async (tx) => {
            try {
                let rate = await getMerchantRate(tx, findMerchant?.merchant_id);
                if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
                    throw new CustomError("Insufficient balance to disburse", 400);
                }
                const result = adjustMerchantToDisburseBalance(findMerchant?.uid, +merchantAmount, false);
                balanceDeducted = true;
            }
            catch (err) {
                if (err instanceof Prisma.PrismaClientKnownRequestError) {
                    if (err.code === 'P2034') {
                        throw new CustomError("Transaction is Pending", 400);
                    }
                }
                throw new CustomError("Database Error", 400);
            }
        }, {
            // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
            maxWait: 60000,
            timeout: 60000,
        });
        const getTimeStamp = await corporateLogin(findDisbureMerch);
        const creatHashKey = await createRSAEncryptedPayload(`${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`);
        const ma2ma = await axios
            .post("https://sea-turtle-app-bom3q.ondigitalocean.app/epd-ma", {
            Amount: obj.merchantAmount ? obj.merchantAmount : merchantAmount,
            MSISDN: findDisbureMerch.MSISDN,
            ReceiverMSISDN: obj.account,
        }, {
            headers: {
                "X-Hash-Value": creatHashKey,
                "X-IBM-Client-Id": findDisbureMerch.clientId,
                "X-IBM-Client-Secret": findDisbureMerch.clientSecret,
                "X-Channel": findDisbureMerch.xChannel,
                accept: "application/json",
                "content-type": "application/json",
            },
        })
            .then((res) => res?.data)
            .catch((error) => {
            throw new CustomError(error?.response?.data?.ResponseMessage, 500);
        });
        let data = {};
        // if (obj.order_id) {
        data["merchant_custom_order_id"] = obj.merchant_custom_order_id;
        // }
        // else {
        // }
        // else {
        data["transaction_id"] = ma2ma.TransactionReference || obj.system_order_id;
        data["system_order_id"] = obj.system_order_id;
        // }
        // Get the current date
        const date = new Date();
        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';
        // Convert the date to the Pakistan timezone
        const zonedDate = toZonedTime(date, timeZone);
        const { walletBalance } = await getWalletBalance(findMerchant.merchant_id);
        console.log(walletBalance + +totalDisbursed);
        if (ma2ma.ResponseMessage == "RESOURCE_TEMPORARY_LOCKED") {
            const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
            balanceDeducted = false;
            throw new CustomError("Transaction is Pending", 202);
        }
        if (ma2ma.ResponseCode != 0) {
            console.log("Disbursement Failed ");
            console.log(totalDisbursed);
            await prisma.$transaction(async (tx) => {
                const result = adjustMerchantToDisburseBalance(findMerchant?.uid, +merchantAmount, true);
                const txn = await prisma.disbursement.update({
                    where: {
                        merchant_custom_order_id: data.merchant_custom_order_id,
                    },
                    data: {
                        transaction_id: data.transaction_id,
                        status: "failed",
                        response_message: ma2ma.ResponseMessage
                    },
                });
                console.log("Disbursement: ", txn);
                // return;
                throw new CustomError(ma2ma.ResponseMessage, 500);
            }, {
                // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
                maxWait: 60000,
                timeout: 60000,
            });
        }
        return await prisma.$transaction(async (tx) => {
            let disbursement = await tx.disbursement.update({
                where: {
                    merchant_custom_order_id: data.merchant_custom_order_id
                },
                data: {
                    transaction_id: data.transaction_id,
                    status: "completed",
                    response_message: "success"
                },
            });
            let webhook_url;
            if (findMerchant?.callback_mode == "DOUBLE") {
                webhook_url = findMerchant.payout_callback;
            }
            else {
                webhook_url = findMerchant?.webhook_url;
            }
            transactionService.sendCallback(webhook_url, {
                original_amount: obj.merchantAmount ? obj.merchantAmount : merchantAmount,
                date_time: zonedDate,
                merchant_transaction_id: disbursement.merchant_custom_order_id,
                merchant_id: findMerchant?.merchant_id,
            }, obj.account, "payout", stringToBoolean(findMerchant?.encrypted), false);
            return {
                message: "Disbursement created successfully",
                merchantAmount: obj.merchantAmount
                    ? obj.merchantAmount.toString()
                    : merchantAmount.toString(),
                order_id: disbursement.merchant_custom_order_id,
                externalApiResponse: {
                    TransactionReference: disbursement.merchant_custom_order_id,
                    TransactionStatus: ma2ma.TransactionStatus,
                },
            };
        }, {
            // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
            maxWait: 60000,
            timeout: 60000,
        });
    }
    catch (error) {
        if (balanceDeducted) {
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant?.uid, +merchantAmount, true); // Adjust the balance
        }
        throw new CustomError(error?.message, error?.statusCode == 202 ? 202 : 500);
    }
};
const adjustMerchantToDisburseBalance = async (merchantId, amount, isIncrement) => {
    try {
        let obj;
        if (isIncrement) {
            obj = await prisma.merchant.updateMany({
                where: {
                    uid: merchantId,
                },
                data: {
                    balanceToDisburse: {
                        increment: amount
                    }
                },
            });
        }
        else {
            obj = await prisma.merchant.updateMany({
                where: {
                    uid: merchantId,
                },
                data: {
                    balanceToDisburse: {
                        decrement: amount
                    },
                },
            });
        }
        return {
            message: "Merchant balance updated successfully",
            obj
        };
    }
    catch (err) {
        throw new CustomError(err.message, 500);
    }
};
const createDisbursementClone = async (obj, merchantId) => {
    let id;
    let data = {};
    let findMerchant;
    let zonedDate = new Date();
    let merchantAmount = new Decimal(obj.amount);
    let amountDecimal = new Decimal(obj.amount);
    let totalCommission = new Decimal(0);
    let totalGST = new Decimal(0);
    let totalWithholdingTax = new Decimal(0);
    let totalDisbursed = new Decimal(0);
    let ma2ma;
    let walletBalance;
    let balanceDeducted = false;
    try {
        // validate Merchant
        findMerchant = await merchantService.findOne({
            uid: merchantId,
        });
        if (!findMerchant) {
            throw new CustomError("Merchant not found", 404);
        }
        if (!findMerchant.EasyPaisaDisburseAccountId) {
            throw new CustomError("Disbursement account not assigned.", 404);
        }
        if (obj.order_id) {
            const checkOrder = await prisma.disbursement.findFirst({
                where: {
                    merchant_custom_order_id: obj.order_id,
                },
            });
            if (checkOrder) {
                throw new CustomError("Order ID already exists", 400);
            }
        }
        // find disbursement merchant
        const findDisbureMerch = await easyPaisaDisburse
            .getDisburseAccount(findMerchant.EasyPaisaDisburseAccountId)
            .then((res) => res?.data);
        if (!findDisbureMerch) {
            throw new CustomError("Disbursement account not found", 404);
        }
        // Phone number validation (must start with 92)
        if (!obj.phone.startsWith("92")) {
            throw new CustomError("Number should start with 92", 400);
        }
        id = transactionService.createTransactionId();
        data = {};
        if (obj.order_id) {
            data["merchant_custom_order_id"] = obj.order_id;
        }
        else {
            data["merchant_custom_order_id"] = id;
        }
        // else {
        data["system_order_id"] = id;
        // Fetch merchant financial terms
        await prisma.$transaction(async (tx) => {
            try {
                let rate = await getMerchantRate(tx, findMerchant.merchant_id);
                // Calculate total deductions and merchant amount
                totalCommission = amountDecimal.mul(rate.disbursementRate);
                totalGST = amountDecimal.mul(rate.disbursementGST);
                totalWithholdingTax = amountDecimal.mul(rate.disbursementWithHoldingTax);
                const totalDeductions = totalCommission
                    .plus(totalGST)
                    .plus(totalWithholdingTax);
                merchantAmount = obj.amount
                    ? amountDecimal.plus(totalDeductions)
                    : amountDecimal.minus(totalDeductions);
                balanceDeducted = true;
                if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
                    throw new CustomError("Insufficient balance to disburse", 400);
                }
                const result = adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, false);
            }
            catch (err) {
                if (err instanceof Prisma.PrismaClientKnownRequestError) {
                    if (err.code === 'P2034') {
                        await prisma.disbursement.create({
                            data: {
                                ...data,
                                // transaction_id: id,
                                merchant_id: Number(findMerchant.merchant_id),
                                disbursementDate: new Date(),
                                transactionAmount: amountDecimal,
                                commission: totalCommission,
                                gst: totalGST,
                                withholdingTax: totalWithholdingTax,
                                merchantAmount: obj.amount ? obj.amount : merchantAmount,
                                platform: 0,
                                account: obj.phone,
                                provider: PROVIDERS.EASYPAISA,
                                status: "pending",
                                response_message: "pending",
                                to_provider: PROVIDERS.EASYPAISA,
                                providerDetails: {
                                    id: findMerchant?.EasypaisaDisburseAccountId
                                }
                            },
                        });
                        throw new CustomError("Transaction is Pending", 202);
                    }
                }
                throw new CustomError("Database Error", 400);
            }
        }, {
            // isolationLevel: Prisma.TransctionIsolationLevel.Serializable,
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
            maxWait: 60000,
            timeout: 60000,
        });
        const getTimeStamp = await corporateLogin(findDisbureMerch);
        const creatHashKey = await createRSAEncryptedPayload(`${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`);
        const ma2ma = await axios
            .post("https://sea-turtle-app-bom3q.ondigitalocean.app/epd-ma", {
            Amount: obj.amount ? obj.amount : merchantAmount,
            MSISDN: findDisbureMerch.MSISDN,
            ReceiverMSISDN: obj.phone,
        }, {
            headers: {
                "X-Hash-Value": creatHashKey,
                "X-IBM-Client-Id": findDisbureMerch.clientId,
                "X-IBM-Client-Secret": findDisbureMerch.clientSecret,
                "X-Channel": findDisbureMerch.xChannel,
                accept: "application/json",
                "content-type": "application/json",
            },
        })
            .then((res) => res?.data)
            .catch((error) => {
            throw new CustomError(error?.response?.data?.ResponseMessage, 500);
        });
        data["transaction_id"] = ma2ma.TransactionReference;
        // }
        // Get the current date
        const date = new Date();
        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';
        // Convert the date to the Pakistan timezone
        zonedDate = toZonedTime(date, timeZone);
        console.log(walletBalance + +totalDisbursed);
        // Update the code to make pending payouts when ma2ma.ResponseMessage is RESOURCE_TEMPORARY_LOCKED
        if (ma2ma.ResponseMessage == "RESOURCE_TEMPORARY_LOCKED") {
            console.log(JSON.stringify({ event: "EP_MW_RESPONSE_DATA_NOT_RECIEVED", res: ma2ma, id, order_id: obj.order_id }));
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
            await prisma.disbursement.create({
                data: {
                    ...data,
                    // transaction_id: id,
                    merchant_id: Number(findMerchant.merchant_id),
                    disbursementDate: new Date(),
                    transactionAmount: amountDecimal,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount: obj.amount ? obj.amount : merchantAmount,
                    platform: 0,
                    account: obj.phone,
                    provider: PROVIDERS.EASYPAISA,
                    status: "pending",
                    response_message: "pending",
                    to_provider: PROVIDERS.EASYPAISA,
                    providerDetails: {
                        id: findMerchant?.JazzCashDisburseAccountId
                    }
                },
            });
            balanceDeducted = false;
            throw new CustomError("Transaction is Pending", 202);
        }
        if (ma2ma.ResponseCode != 0) {
            console.log("Disbursement Failed ");
            console.log(totalDisbursed);
            await prisma.$transaction(async (tx) => {
                const result = adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
                balanceDeducted = false;
                await saveToCsv({
                    id: data.merchant_custom_order_id,
                    order_amount: obj.amount ? obj.amount : merchantAmount,
                    balance: totalDisbursed,
                    status: "failed"
                });
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
                console.log("Disbursement: ", txn);
                // return;
                throw new CustomError(ma2ma.ResponseMessage, 500);
            }, {
                // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
                maxWait: 60000,
                timeout: 60000,
            });
        }
        return await prisma.$transaction(async (tx) => {
            // Update transactions to adjust balances
            // Create disbursement record
            await saveToCsv({
                id: data.merchant_custom_order_id,
                order_amount: obj.amount ? obj.amount : merchantAmount,
                balance: walletBalance,
                status: "completed"
            });
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
            let webhook_url;
            if (findMerchant.callback_mode == "DOUBLE") {
                webhook_url = findMerchant.payout_callback;
            }
            else {
                webhook_url = findMerchant.webhook_url;
            }
            transactionService.sendCallback(webhook_url, {
                original_amount: obj.amount ? obj.amount : merchantAmount,
                date_time: zonedDate,
                merchant_transaction_id: disbursement.merchant_custom_order_id,
                merchant_id: findMerchant.merchant_id,
            }, obj.phone, "payout", stringToBoolean(findMerchant.encrypted), false);
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
        }, {
            // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
            maxWait: 60000,
            timeout: 60000,
        });
    }
    catch (error) {
        // console.log("MW Transaction Error", err);
        console.log(JSON.stringify({ event: "MW_TRANSACTION_ERROR", message: error?.message, statusCode: error?.statusCode == 202 ? 202 : 500, id: id, order_id: obj.order_id }));
        if (balanceDeducted) {
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
        }
        throw new CustomError(error?.message, error?.statusCode == 202 ? 202 : 500);
    }
};
const getDisbursement = async (merchantId, params) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");
        const customWhere = {
            deletedAt: null,
        };
        if (merchantId) {
            customWhere["merchant_id"] = +merchantId;
        }
        if (params.account) {
            customWhere["account"] = {
                contains: params.account
            };
        }
        if (params.transaction_id) {
            customWhere["transaction_id"] = params.transaction_id;
        }
        if (startDate && endDate) {
            const todayStart = parseISO(startDate);
            const todayEnd = parseISO(endDate);
            customWhere["disbursementDate"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }
        if (params.merchantTransactionId) {
            customWhere["merchant_custom_order_id"] = params.merchantTransactionId;
        }
        if (params.status) {
            customWhere["status"] = params.status;
        }
        let { page, limit } = params;
        // Query based on provided parameters
        let skip, take = 0;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page) - 1 : parseInt(page)) * parseInt(limit);
            take = parseInt(limit);
        }
        const disbursements = await prisma.disbursement
            .findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take + 1 }),
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
        let hasMore = false;
        console.log(disbursements.length, take);
        if (take > 0) {
            hasMore = disbursements.length > take;
            if (hasMore) {
                disbursements.pop(); // Remove the extra record
            }
        }
        // Build meta with hasMore flag
        const meta = {
            page: page ? parseInt(page) : 1,
            limit: take,
            hasMore,
        };
        const response = {
            transactions: disbursements.map((transaction) => ({
                ...transaction,
                jazzCashMerchant: transaction.merchant,
            })),
            meta,
        };
        return response;
    }
    catch (error) {
        throw new CustomError(error?.error || "Unable to get disbursement", error?.statusCode || 500);
    }
};
const getTeleDisbursementLast15MinsFromLast10Mins = async (query) => {
    try {
        const { merchantId, transactionId, merchantName, merchantTransactionId, response_message } = query;
        let startDate = query?.start;
        let endDate = query?.end;
        const status = query?.status;
        const search = query?.search || "";
        const msisdn = query?.msisdn || "";
        const provider = query?.provider || "";
        const customWhere = { AND: [] };
        if (startDate && endDate) {
            const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            customWhere.AND.push({
                date_time: {
                    gte: todayStart,
                    lt: todayEnd,
                }
            });
        }
        if (status) {
            customWhere.AND.push({ status });
        }
        if (search) {
            customWhere.AND.push({
                transaction_id: {
                    contains: search
                }
            });
        }
        if (msisdn) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['msisdn'],
                    equals: msisdn
                }
            });
        }
        if (provider) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['name'],
                    equals: provider
                }
            });
        }
        if (merchantTransactionId) {
            customWhere.AND.push({
                merchant_transaction_id: merchantTransactionId
            });
        }
        if (response_message) {
            customWhere.AND.push({
                response_message: {
                    contains: response_message
                }
            });
        }
        if (merchantId) {
            customWhere["merchant_id"] = Number(merchantId);
        }
        const timezone = 'Asia/Karachi';
        const currentTime = toZonedTime(new Date(), timezone);
        const fifteenMinutesAgo = subMinutes(currentTime, 15);
        const threeMinutesAgo = subMinutes(currentTime, 10);
        const transactions = await prisma.disbursement.findMany({
            where: {
                ...customWhere,
                disbursementDate: {
                    gte: fifteenMinutesAgo,
                    lte: threeMinutesAgo,
                },
            },
            orderBy: {
                disbursementDate: 'desc',
            },
            include: {
                merchant: {
                    include: {
                        groups: {
                            include: {
                                merchant: {
                                    include: {
                                        jazzCashMerchant: true,
                                    },
                                },
                            },
                        },
                    },
                }
            }
        });
        return { transactions };
    }
    catch (err) {
        console.error(err);
        return { error: 'Internal Server Error' };
    }
};
const exportDisbursement = async (merchantId, params) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");
        const customWhere = {
            deletedAt: null,
        };
        if (merchantId) {
            customWhere["merchant_id"] = +merchantId;
        }
        if (params.account) {
            customWhere["account"] = {
                contains: params.account
            };
        }
        if (params.transaction_id) {
            customWhere["transaction_id"] = params.transaction_id;
        }
        if (startDate && endDate) {
            const todayStart = parseISO(startDate);
            const todayEnd = parseISO(endDate);
            customWhere["disbursementDate"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }
        if (params.merchantTransactionId) {
            customWhere["merchant_custom_order_id"] = params.merchantTransactionId;
        }
        if (params.status) {
            customWhere["status"] = params.status;
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
            'account',
            'transaction_id',
            'merchant_order_id',
            'disbursement_date',
            'transaction_amount',
            'commission',
            'gst',
            'withholding_tax',
            'merchant_amount',
            'status',
            'provider',
            'callback_sent'
        ];
        const timeZone = 'Asia/Karachi';
        const data = disbursements.map(transaction => ({
            merchant: transaction.merchant.full_name,
            account: transaction.account,
            transaction_id: transaction.transaction_id,
            merchant_order_id: transaction.merchant_custom_order_id,
            disbursement_date: format(toZonedTime(transaction.disbursementDate, timeZone), 'yyyy-MM-dd HH:mm:ss', { timeZone }),
            transaction_amount: transaction.transactionAmount,
            commission: transaction.commission,
            gst: transaction.gst,
            withholding_tax: transaction.withholdingTax,
            merchant_amount: transaction.merchantAmount,
            status: transaction.status,
            provider: transaction.provider,
            callback_sent: transaction.callback_sent
        }));
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);
        const csvNoQuotes = csv.replace(/"/g, '');
        return `${csvNoQuotes}\nTotal Settled Amount,,${totalAmount}`;
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
    }
    catch (error) {
        throw new CustomError(error?.error || "Unable to get disbursement", error?.statusCode || 500);
    }
};
const disburseThroughBankClone = async (obj, merchantId) => {
    let balanceDeducted = true;
    let findMerchant = null;
    let id;
    let merchantAmount = new Decimal(obj.amount);
    try {
        // validate Merchant
        findMerchant = await merchantService.findOne({
            uid: merchantId,
        });
        if (!findMerchant) {
            throw new CustomError("Merchant not found", 404);
        }
        if (!findMerchant.EasyPaisaDisburseAccountId) {
            throw new CustomError("Disbursement account not assigned.", 404);
        }
        // find disbursement merchant
        const findDisbureMerch = await easyPaisaDisburse
            .getDisburseAccount(findMerchant.EasyPaisaDisburseAccountId)
            .then((res) => res?.data);
        if (!findDisbureMerch) {
            throw new CustomError("Disbursement account not found", 404);
        }
        if (obj.order_id) {
            const checkOrder = await prisma.disbursement.findFirst({
                where: {
                    merchant_custom_order_id: obj.order_id,
                },
            });
            if (checkOrder) {
                throw new CustomError("Order ID already exists", 400);
            }
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
        let amountDecimal = new Decimal(obj.amount);
        let totalCommission = new Decimal(0);
        let totalGST = new Decimal(0);
        let totalWithholdingTax = new Decimal(0);
        let totalDisbursed = new Decimal(0);
        let id = transactionService.createTransactionId();
        let data2 = {};
        if (obj.order_id) {
            data2["merchant_custom_order_id"] = obj.order_id;
        }
        else {
            data2["merchant_custom_order_id"] = id;
        }
        // else {
        data2["system_order_id"] = id;
        await prisma.$transaction(async (tx) => {
            try {
                let rate = await getMerchantRate(tx, findMerchant?.merchant_id);
                // Calculate total deductions and merchant amount
                totalCommission = amountDecimal.mul(rate.disbursementRate);
                totalGST = amountDecimal.mul(rate.disbursementGST);
                totalWithholdingTax = amountDecimal.mul(rate.disbursementWithHoldingTax);
                const totalDeductions = totalCommission
                    .plus(totalGST)
                    .plus(totalWithholdingTax);
                merchantAmount = obj.amount
                    ? amountDecimal.plus(totalDeductions)
                    : amountDecimal.minus(totalDeductions);
                if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
                    throw new CustomError("Insufficient balance to disburse", 400);
                }
                const result = adjustMerchantToDisburseBalance(findMerchant?.uid, +merchantAmount, false);
                balanceDeducted = true;
            }
            catch (err) {
                if (err instanceof Prisma.PrismaClientKnownRequestError) {
                    if (err.code === 'P2034') {
                        await prisma.disbursement.create({
                            data: {
                                ...data2,
                                // transaction_id: id,
                                merchant_id: Number(findMerchant?.merchant_id),
                                disbursementDate: new Date(),
                                transactionAmount: amountDecimal,
                                commission: totalCommission,
                                gst: totalGST,
                                withholdingTax: totalWithholdingTax,
                                merchantAmount: obj.amount ? obj.amount : merchantAmount,
                                platform: 0,
                                account: obj.accountNo,
                                provider: PROVIDERS.EASYPAISA,
                                status: "pending",
                                response_message: "pending",
                                to_provider: obj.bankName,
                                providerDetails: {
                                    id: findMerchant?.JazzCashDisburseAccountId
                                }
                            },
                        });
                        throw new CustomError("Transaction is Pending", 400);
                    }
                }
                throw new CustomError("Not Enough Balance", 400);
            }
        }, {
            // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
            maxWait: 60000,
            timeout: 60000,
        });
        const getTimeStamp = await corporateLogin(findDisbureMerch);
        const creatHashKey = await createRSAEncryptedPayload(`${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`);
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
        let { walletBalance } = await getWalletBalance(findMerchant.merchant_id);
        if (res.data.ResponseMessage == "RESOURCE_TEMPORARY_LOCKED") {
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
            await prisma.disbursement.create({
                data: {
                    ...data2,
                    // transaction_id: id,
                    merchant_id: Number(findMerchant.merchant_id),
                    disbursementDate: new Date(),
                    transactionAmount: amountDecimal,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount: obj.amount ? obj.amount : merchantAmount,
                    platform: 0,
                    account: obj.accountNo,
                    provider: PROVIDERS.EASYPAISA,
                    status: "pending",
                    response_message: "pending",
                    to_provider: obj.bankName,
                    providerDetails: {
                        id: findMerchant?.JazzCashDisburseAccountId
                    }
                },
            });
            balanceDeducted = false;
            throw new CustomError("Transaction is Pending", 202);
        }
        if (res.data.ResponseCode != "0") {
            console.log("Response: ", res.data);
            data2["transaction_id"] = res.data.TransactionReference || id;
            // Get the current date
            const date = new Date();
            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';
            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            console.log("Transfer Inquiry Error: ", res.data);
            await prisma.$transaction(async (tx) => {
                const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant?.uid, +merchantAmount, true);
                balanceDeducted = false;
                await prisma.disbursement.create({
                    data: {
                        ...data2,
                        // transaction_id: id,
                        merchant_id: Number(findMerchant?.merchant_id),
                        disbursementDate: zonedDate,
                        transactionAmount: amountDecimal,
                        commission: totalCommission,
                        gst: totalGST,
                        withholdingTax: totalWithholdingTax,
                        merchantAmount: obj.amount ? obj.amount : merchantAmount,
                        platform: res.data.Fee,
                        account: obj.accountNo,
                        provider: PROVIDERS.BANK,
                        status: "failed",
                        response_message: res.data.ResponseMessage,
                        providerDetails: {
                            id: findMerchant?.EasyPaisaDisburseAccountId,
                            sub_name: PROVIDERS.EASYPAISA
                        }
                    },
                });
                throw new CustomError(res?.data?.ResponseMessage, 500);
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
                maxWait: 60000,
                timeout: 60000
            });
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
        if (res2.data.ResponseMessage == "RESOURCE_TEMPORARY_LOCKED") {
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
            await prisma.disbursement.create({
                data: {
                    ...data2,
                    // transaction_id: id,
                    merchant_id: Number(findMerchant.merchant_id),
                    disbursementDate: new Date(),
                    transactionAmount: amountDecimal,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount: obj.amount ? obj.amount : merchantAmount,
                    platform: 0,
                    account: obj.accountNo,
                    provider: PROVIDERS.EASYPAISA,
                    status: "pending",
                    response_message: "pending",
                    to_provider: obj.bankName,
                    providerDetails: {
                        id: findMerchant?.JazzCashDisburseAccountId
                    }
                },
            });
            balanceDeducted = false;
            throw new CustomError("Transaction is Pending", 202);
        }
        if (res2.data.ResponseCode != "0") {
            console.log("Response: ", res.data);
            data2["transaction_id"] = res.data.TransactionReference || id;
            // Get the current date
            const date = new Date();
            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';
            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            await prisma.$transaction(async (tx) => {
                const result = easyPaisaService.adjustMerchantToDisburseBalance(findMerchant?.uid, +merchantAmount, true);
                balanceDeducted = false;
                await prisma.disbursement.create({
                    data: {
                        ...data2,
                        // transaction_id: id,
                        merchant_id: Number(findMerchant?.merchant_id),
                        disbursementDate: zonedDate,
                        transactionAmount: amountDecimal,
                        commission: totalCommission,
                        gst: totalGST,
                        withholdingTax: totalWithholdingTax,
                        merchantAmount: obj.amount ? obj.amount : merchantAmount,
                        platform: res.data.Fee,
                        account: obj.accountNo,
                        provider: PROVIDERS.BANK,
                        status: "failed",
                        response_message: res.data.ResponseMessage,
                        providerDetails: {
                            id: findMerchant?.EasyPaisaDisburseAccountId,
                            sub_name: PROVIDERS.EASYPAISA
                        }
                    },
                });
                throw new CustomError(res.data.ResponseMessage, 500);
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
                maxWait: 60000,
                timeout: 60000
            });
        }
        return await prisma.$transaction(async (tx) => {
            data2["transaction_id"] = res.data.TransactionReference;
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
                    merchant_id: Number(findMerchant?.merchant_id),
                    disbursementDate: zonedDate,
                    transactionAmount: amountDecimal,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount: obj.amount ? obj.amount : merchantAmount,
                    platform: res2.data.Fee,
                    account: obj.accountNo,
                    provider: PROVIDERS.BANK,
                    status: "completed",
                    response_message: "success",
                    providerDetails: {
                        id: findMerchant?.EasyPaisaDisburseAccountId,
                        sub_name: PROVIDERS.EASYPAISA
                    }
                },
            });
            let webhook_url;
            if (findMerchant?.callback_mode == "DOUBLE") {
                webhook_url = findMerchant.payout_callback;
            }
            else {
                webhook_url = findMerchant?.webhook_url;
            }
            transactionService.sendCallback(webhook_url, {
                original_amount: obj.amount ? obj.amount : merchantAmount,
                date_time: zonedDate,
                merchant_transaction_id: disbursement.merchant_custom_order_id,
                merchant_id: findMerchant?.merchant_id,
            }, obj.phone, "payout", stringToBoolean(findMerchant?.encrypted), false);
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
        }, {
            maxWait: 5000,
            timeout: 60000,
        });
    }
    catch (err) {
        // console.log("Initiate Transaction Error", err);
        console.log(JSON.stringify({ event: "TRANSACTION_ERROR", errorMessage: err?.message, statusCode: err?.statusCode || 500, id, order_id: obj.order_id }));
        if (balanceDeducted) {
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant?.uid, +merchantAmount, true);
        }
        throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
    }
};
const updateDisburseThroughBank = async (obj, merchantId) => {
    let balanceDeducted = false;
    let findMerchant = null;
    let merchantAmount = new Decimal(+obj.merchantAmount + +obj.commission + +obj.gst + +obj.withholdingTax);
    try {
        // validate Merchant
        findMerchant = await merchantService.findOne({
            uid: merchantId,
        });
        if (!findMerchant) {
            throw new CustomError("Merchant not found", 404);
        }
        if (!findMerchant.EasyPaisaDisburseAccountId) {
            throw new CustomError("Disbursement account not assigned.", 404);
        }
        // find disbursement merchant
        const findDisbureMerch = await easyPaisaDisburse
            .getDisburseAccount(findMerchant.EasyPaisaDisburseAccountId)
            .then((res) => res?.data);
        if (!findDisbureMerch) {
            throw new CustomError("Disbursement account not found", 404);
        }
        if (obj.order_id) {
            const checkOrder = await prisma.disbursement.findFirst({
                where: {
                    merchant_custom_order_id: obj.order_id,
                },
            });
            if (checkOrder) {
                throw new CustomError("Order ID already exists", 400);
            }
        }
        // Phone number validation (must start with 92)
        // if (!obj.phone.startsWith("92")) {
        //   throw new CustomError("Number should start with 92", 400);
        // }
        // Fetch merchant financial terms
        const bank = bankDetails.find((bank) => bank.BankName === obj.to_provider);
        if (!bank) {
            throw new CustomError("Bank not found", 404);
        }
        let amountDecimal = new Decimal(0);
        let totalDisbursed = new Decimal(obj.merchantAmount);
        await prisma.$transaction(async (tx) => {
            try {
                let rate = await getMerchantRate(tx, findMerchant?.merchant_id);
                if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
                    throw new CustomError("Insufficient balance to disburse", 400);
                }
                const result = adjustMerchantToDisburseBalance(findMerchant?.uid, +merchantAmount, false);
            }
            catch (err) {
                if (err instanceof Prisma.PrismaClientKnownRequestError) {
                    if (err.code === 'P2034') {
                        throw new CustomError("Deadlock Error", 400);
                    }
                }
                throw new CustomError("Database Error", 400);
            }
        }, {
            // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
            maxWait: 60000,
            timeout: 60000,
        });
        const getTimeStamp = await corporateLogin(findDisbureMerch);
        const creatHashKey = await createRSAEncryptedPayload(`${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`);
        const headers = {
            "X-IBM-Client-Id": findDisbureMerch.clientId,
            "X-IBM-Client-Secret": findDisbureMerch.clientSecret,
            "X-Channel": findDisbureMerch.xChannel,
            "X-Hash-Value": `${creatHashKey}`,
        };
        let data = {
            AccountNumber: obj.account,
            BankTitle: bank.BankTitle,
            MSISDN: findDisbureMerch.MSISDN,
            ReceiverMSISDN: "03332165123",
            BankShortName: bank.BankShortName,
            TransactionPurpose: "0350",
            Amount: obj.merchantAmount,
        };
        let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "https://sea-turtle-app-bom3q.ondigitalocean.app/epd-ibft-i",
            headers: headers,
            data: data,
        };
        let res = await axios.request(config);
        let data2 = {};
        let { walletBalance } = await getWalletBalance(findMerchant.merchant_id);
        if (res.data.ResponseMessage == "RESOURCE_TEMPORARY_LOCKED") {
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
            balanceDeducted = false;
            throw new CustomError("Transaction is Pending", 202);
        }
        if (res.data.ResponseCode != "0") {
            // if (obj.order_id) {
            data2["merchant_custom_order_id"] = obj.merchant_custom_order_id;
            // }
            // else {
            // data2["merchant_custom_order_id"] = id;
            // }
            // else {
            data2["transaction_id"] = res.data.TransactionReference || obj.system_order_id;
            data2["system_order_id"] = obj.system_order_id;
            // Get the current date
            const date = new Date();
            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';
            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            console.log("Transfer Inquiry Error: ", res.data);
            await prisma.$transaction(async (tx) => {
                const result = adjustMerchantToDisburseBalance(findMerchant?.uid, +merchantAmount, true);
                await prisma.disbursement.update({
                    where: {
                        merchant_custom_order_id: data2.merchant_custom_order_id,
                    },
                    data: {
                        transaction_id: data2.transaction_id,
                        status: "failed",
                        response_message: res.data.ResponseMessage
                    },
                });
                throw new CustomError("Error conducting transfer inquiry", 500);
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
                maxWait: 60000,
                timeout: 60000
            });
        }
        let data3 = {
            AccountNumber: obj.account,
            BankTitle: bank.BankTitle,
            MSISDN: findDisbureMerch.MSISDN,
            ReceiverMSISDN: "03332165123",
            BankShortName: bank.BankShortName,
            TransactionPurpose: "0350",
            Amount: obj.merchantAmount,
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
        if (res2.data.ResponseMessage == "RESOURCE_TEMPORARY_LOCKED") {
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
            balanceDeducted = false;
            throw new CustomError("Transaction is Pending", 202);
        }
        if (res2.data.ResponseCode != "0") {
            data2["merchant_custom_order_id"] = obj.merchant_custom_order_id;
            // else {
            data2["transaction_id"] = res.data.TransactionReference || obj.system_order_id;
            data2["system_order_id"] = obj.system_order_id;
            // Get the current date
            const date = new Date();
            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';
            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            await prisma.$transaction(async (tx) => {
                const result = adjustMerchantToDisburseBalance(findMerchant?.uid, +merchantAmount, true);
                await prisma.disbursement.update({
                    where: {
                        merchant_custom_order_id: data2.merchant_custom_order_id
                    },
                    data: {
                        transaction_id: data2.transaction_id,
                        status: "failed",
                        response_message: res.data.ResponseMessage
                    },
                });
                throw new CustomError("Error conducting transfer inquiry", 500);
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
                maxWait: 60000,
                timeout: 60000
            });
        }
        return await prisma.$transaction(async (tx) => {
            data2["merchant_custom_order_id"] = obj.merchant_custom_order_id;
            // else {
            data2["transaction_id"] = res.data.TransactionReference;
            data2["system_order_id"] = obj.system_order_id;
            // Get the current date
            const date = new Date();
            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';
            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            // Create disbursement record
            let disbursement = await tx.disbursement.update({
                where: {
                    merchant_custom_order_id: obj.merchant_custom_order_id
                },
                data: {
                    transaction_id: data2.transaction_id,
                    status: "completed",
                    response_message: "success"
                },
            });
            let webhook_url;
            if (findMerchant?.callback_mode == "DOUBLE") {
                webhook_url = findMerchant.payout_callback;
            }
            else {
                webhook_url = findMerchant?.webhook_url;
            }
            transactionService.sendCallback(webhook_url, {
                original_amount: obj.merchantAmount ? obj.merchantAmount : merchantAmount,
                date_time: zonedDate,
                merchant_transaction_id: disbursement.merchant_custom_order_id,
                merchant_id: findMerchant?.merchant_id,
            }, obj.account, "payout", stringToBoolean(findMerchant?.encrypted), false);
            return {
                message: "Disbursement created successfully",
                merchantAmount: obj.merchantAmount
                    ? obj.merchantAmount.toString()
                    : merchantAmount.toString(),
                order_id: disbursement.merchant_custom_order_id,
                externalApiResponse: {
                    TransactionReference: disbursement.merchant_custom_order_id,
                    TransactionStatus: res2.data.TransactionStatus,
                },
            };
        }, {
            maxWait: 5000,
            timeout: 60000,
        });
    }
    catch (err) {
        console.log(err);
        if (balanceDeducted) {
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant?.uid, +merchantAmount, true);
        }
        throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
    }
};
const disburseThroughBank = async (obj, merchantId) => {
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
        const findDisbureMerch = await easyPaisaDisburse
            .getDisburseAccount(findMerchant.EasyPaisaDisburseAccountId)
            .then((res) => res?.data);
        if (!findDisbureMerch) {
            throw new CustomError("Disbursement account not found", 404);
        }
        if (obj.order_id) {
            const checkOrder = await prisma.disbursement.findFirst({
                where: {
                    merchant_custom_order_id: obj.order_id,
                },
            });
            if (checkOrder) {
                throw new CustomError("Order ID already exists", 400);
            }
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
        let merchantAmount = new Decimal(0);
        let amountDecimal = new Decimal(0);
        let totalCommission = new Decimal(0);
        let totalGST = new Decimal(0);
        let totalWithholdingTax = new Decimal(0);
        let totalDisbursed = new Decimal(0);
        await prisma.$transaction(async (tx) => {
            let rate = await getMerchantRate(tx, findMerchant.merchant_id);
            const transactions = await getEligibleTransactions(findMerchant.merchant_id, tx);
            if (transactions.length === 0) {
                throw new CustomError("No eligible transactions to disburse", 400);
            }
            let updates = [];
            totalDisbursed = new Decimal(0);
            if (obj.amount) {
                amountDecimal = new Decimal(obj.amount);
            }
            else {
                updates = transactions.map((t) => ({
                    transaction_id: t.transaction_id,
                    disbursed: true,
                    balance: new Decimal(0),
                    settled_amount: t.settled_amount,
                    original_amount: t.original_amount,
                }));
                totalDisbursed = transactions.reduce((sum, t) => sum.plus(t.balance), new Decimal(0));
                amountDecimal = totalDisbursed;
            }
            // Calculate total deductions and merchant amount
            totalCommission = amountDecimal.mul(rate.disbursementRate);
            totalGST = amountDecimal.mul(rate.disbursementGST);
            totalWithholdingTax = amountDecimal.mul(rate.disbursementWithHoldingTax);
            const totalDeductions = totalCommission
                .plus(totalGST)
                .plus(totalWithholdingTax);
            merchantAmount = obj.amount
                ? amountDecimal.plus(totalDeductions)
                : amountDecimal.minus(totalDeductions);
            // Get eligible transactions
            if (obj.amount) {
                const result = calculateDisbursement(transactions, merchantAmount);
                updates = result.updates;
                totalDisbursed = totalDisbursed.plus(result.totalDisbursed);
            }
            await updateTransactions(updates, tx);
        }, {
            // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
            maxWait: 60000,
            timeout: 60000,
        });
        const getTimeStamp = await corporateLogin(findDisbureMerch);
        const creatHashKey = await createRSAEncryptedPayload(`${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`);
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
        let data2 = {};
        let { walletBalance } = await getWalletBalance(findMerchant.merchant_id);
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
            await prisma.$transaction(async (tx) => {
                totalDisbursed = walletBalance + +totalDisbursed;
                await backofficeService.adjustMerchantWalletBalance(findMerchant.merchant_id, totalDisbursed, false);
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
                });
                throw new CustomError("Error conducting transfer inquiry", 500);
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
                maxWait: 60000,
                timeout: 60000
            });
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
            await prisma.$transaction(async (tx) => {
                totalDisbursed = walletBalance + +totalDisbursed;
                await backofficeService.adjustMerchantWalletBalance(findMerchant.merchant_id, totalDisbursed, false);
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
                });
                throw new CustomError("Error conducting transfer inquiry", 500);
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
                maxWait: 60000,
                timeout: 60000
            });
        }
        return await prisma.$transaction(async (tx) => {
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
                webhook_url = findMerchant.payout_callback;
            }
            else {
                webhook_url = findMerchant.webhook_url;
            }
            transactionService.sendCallback(webhook_url, {
                original_amount: obj.amount ? obj.amount : merchantAmount,
                date_time: zonedDate,
                merchant_transaction_id: disbursement.merchant_custom_order_id,
                merchant_id: findMerchant.merchant_id,
            }, obj.phone, "payout", stringToBoolean(findMerchant.encrypted), false);
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
        }, {
            maxWait: 5000,
            timeout: 60000,
        });
    }
    catch (err) {
        console.log(err);
        throw new CustomError("Disbursement Failed", 500);
    }
};
const accountBalance = async (merchantId) => {
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
        const findDisbureMerch = await easyPaisaDisburse
            .getDisburseAccount(findMerchant.EasyPaisaDisburseAccountId)
            .then((res) => res?.data);
        if (!findDisbureMerch) {
            throw new CustomError("Disbursement account not found", 404);
        }
        const getTimeStamp = await corporateLogin(findDisbureMerch);
        const creatHashKey = await createRSAEncryptedPayload(`${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`);
        console.log(creatHashKey);
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
            console.log(response?.data);
            throw new CustomError("Error while getting balance", 500);
        }
        console.log(response?.data);
        return {
            amount: response?.data?.amount
        };
    }
    catch (err) {
        throw new CustomError(err?.message || "An error occurred while initiating the transaction", 500);
    }
};
const transactionInquiry = async (obj, merchantId) => {
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
        const findDisbureMerch = await easyPaisaDisburse
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
            throw new CustomError("Transaction not found", 500);
        }
        const getTimeStamp = await corporateLogin(findDisbureMerch);
        const creatHashKey = await createRSAEncryptedPayload(`${findDisbureMerch.MSISDN}~${getTimeStamp.Timestamp}`);
        let data = JSON.stringify({
            "transactionID": transaction.transaction_id
        });
        console.log(data);
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
        let response = await axios.request(config);
        if (response?.data?.ResponseCode != "0") {
            console.log(response?.data);
            throw new CustomError("Error while getting balance", 500);
        }
        console.log(response?.data);
        let data3 = response?.data;
        return {
            ...data3,
            transactionID: obj.transactionId
        };
    }
    catch (err) {
        throw new CustomError(err?.message || "An error occurred while initiating the transaction", 500);
    }
};
// const transactionINquiry
export default {
    initiateEasyPaisa,
    initiateEasyPaisaClone,
    getTeleDisbursementLast15MinsFromLast10Mins,
    createMerchant,
    getMerchant,
    updateMerchant,
    createRSAEncryptedPayload,
    initiateEasyPaisaAsyncClone,
    deleteMerchant,
    easypaisainquiry,
    getMerchantChannel,
    createDisbursement,
    updateDisbursement,
    createDisbursementClone,
    adjustMerchantToDisburseBalance,
    disburseThroughBankClone,
    getDisbursement,
    disburseThroughBank,
    getTransaction,
    // getTransaction,
    initiateEasyPaisaAsync,
    accountBalance,
    transactionInquiry,
    getMerchantInquiryMethod,
    saveToCsv,
    exportDisbursement,
    updateDisburseThroughBank,
};
