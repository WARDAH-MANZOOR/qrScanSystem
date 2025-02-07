import CustomError from "../../utils/custom_error.js";
import prisma from "../../prisma/client.js";
import analyticsService from "./analytics.js";
import { format } from "date-fns";
import { addWeekdays } from "../../utils/date_method.js";
import axios from "axios";
import { transactionService } from "../../services/index.js";
import { callbackEncrypt } from "../../utils/enc_dec.js";
import { Decimal } from "@prisma/client/runtime/library";
const isValidTransactionRequest = (data) => {
    const errors = [];
    // Validate date_time
    if (!data.id || !data.id.startsWith("T")) {
        errors.push({ msg: "Invalid Transaction Id", param: "id" });
    }
    // Validate original_amount
    if (!data.original_amount ||
        isNaN(parseFloat(data.original_amount)) ||
        parseFloat(data.original_amount) <= 0) {
        errors.push({
            msg: "Original amount must be a positive number",
            param: "original_amount",
        });
    }
    // Validate type
    const validTypes = ["wallet", "card", "bank"];
    if (!data.type || !validTypes.includes(data.type)) {
        errors.push({ msg: "Invalid transaction type", param: "type" });
    }
    return errors;
};
const isValidTransactionCompletion = (data) => {
    const errors = [];
    // Validate transaction_id
    if (!data.transaction_id || !data.transaction_id.startsWith("T")) {
        errors.push({
            msg: "Transaction ID must be a string",
            param: "transaction_id",
        });
    }
    // Validate status
    const validStatuses = ["completed", "failed"];
    if (!data.status || !validStatuses.includes(data.status)) {
        errors.push({ msg: "Invalid transaction status", param: "status" });
    }
    // Validate provider object if present
    if (data.provider) {
        if (!data.provider.name || typeof data.provider.name !== "string") {
            errors.push({
                msg: "Provider name must be a string",
                param: "provider.name",
            });
        }
        if (!data.provider.type || typeof data.provider.type !== "string") {
            errors.push({
                msg: "Provider transaction type must be a string",
                param: "provider.type",
            });
        }
        if (!data.provider.version || typeof data.provider.version !== "string") {
            errors.push({
                msg: "Provider version must be a string",
                param: "provider.version",
            });
        }
    }
    return errors;
};
const createTransaction = async (obj) => {
    console.log("Called");
    const { id, original_amount, type, merchant_id, order_id } = obj;
    const validationErrors = isValidTransactionRequest(obj);
    if (validationErrors.length > 0) {
        return { errors: validationErrors, success: false };
    }
    let commission = await prisma.merchantFinancialTerms.findUnique({
        where: { merchant_id },
    });
    try {
        console.log(new Date().toLocaleDateString());
        let data = {};
        if (order_id) {
            data["transaction_id"] = order_id;
        }
        else {
            data["transaction_id"] = transactionService.createTransactionId();
        }
        // Create a new transaction request in the database
        const transaction = await prisma.transaction.create({
            data: {
                // order_id,
                ...data,
                transaction_id: id,
                date_time: new Date(),
                original_amount: parseFloat(original_amount),
                status: "pending", // Initially, the transaction is pending
                type: type,
                merchant: {
                    connect: { id: merchant_id },
                },
                settled_amount: parseFloat(original_amount) *
                    (1 - obj.commission),
                balance: parseFloat(original_amount) *
                    (1 - obj.commission),
            },
        });
        console.log("Created");
        // Send the response with the created transaction
        return {
            message: "Transaction request created successfully",
            success: true,
            transaction,
        };
    }
    catch (error) {
        console.log(error);
        throw new CustomError(error?.error, error?.statusCode);
    }
};
const completeTransaction = async (obj) => {
    const { transaction_id, status, response_message, info, provider, merchant_id, } = obj;
    // Validate data
    const validationErrors = isValidTransactionCompletion(obj);
    if (validationErrors.length > 0) {
        return { errors: validationErrors, success: false };
    }
    try {
        const transaction = await prisma.transaction.findUnique({
            where: {
                transaction_id: transaction_id,
                merchant_id,
                status: "pending",
            },
        });
        if (transaction) {
            // Update the transaction as completed or failed
            let date = new Date();
            const updatedTransaction = await prisma.transaction.update({
                where: {
                    transaction_id: transaction_id,
                    merchant_id,
                },
                data: {
                    date_time: date,
                    status: status,
                    response_message: response_message || null,
                    Provider: provider
                        ? {
                            connectOrCreate: {
                                where: {
                                    name_txn_type_version: {
                                        name: provider.name,
                                        txn_type: provider.type,
                                        version: provider.version,
                                    },
                                },
                                create: {
                                    name: provider.name,
                                    txn_type: provider.type,
                                    version: provider.version,
                                },
                            },
                        }
                        : undefined,
                    AdditionalInfo: info
                        ? {
                            create: {
                                bank_id: info.bank_id || null,
                                bill_reference: info.bill_reference || null,
                                retrieval_ref: info.retrieval_ref || null,
                                sub_merchant_id: info.sub_merchant_id || null,
                                custom_field_1: info.custom_field_1 || null,
                                custom_field_2: info.custom_field_2 || null,
                                custom_field_3: info.custom_field_3 || null,
                                custom_field_4: info.custom_field_4 || null,
                                custom_field_5: info.custom_field_5 || null,
                            },
                        }
                        : undefined,
                },
            });
            const settlment = await prisma.merchantFinancialTerms.findUnique({
                where: { merchant_id },
            });
            const scheduledAt = addWeekdays(date, settlment?.settlementDuration); // Call the function to get the next 2 weekdays
            let scheduledTask;
            // Create the scheduled task in the database
            if (status == "completed") {
                scheduledTask = await prisma.scheduledTask.create({
                    data: {
                        transactionId: transaction_id,
                        status: "pending",
                        scheduledAt: scheduledAt, // Assign the calculated weekday date
                        executedAt: null, // Assume executedAt is null when scheduling
                    },
                });
            }
            // Send the response with the updated transaction
            return {
                message: `Transaction ${status} successfully`,
                transaction: updatedTransaction,
                task: scheduledTask,
            };
        }
        else {
            return { message: "Transaction not found" };
        }
    }
    catch (error) {
        console.error(error);
        return { message: "Internal server error" };
    }
};
const createTransactionId = () => {
    const currentTime = Date.now();
    const txnDateTime = format(new Date(), "yyyyMMddHHmmss");
    const fractionalMilliseconds = Math.floor((currentTime - Math.floor(currentTime)) * 1000);
    const txnRefNo = `T${txnDateTime}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`;
    return txnRefNo;
};
const createTxn = async (obj) => {
    let settledAmount = obj.amount * (1 - obj.commission);
    let data = {};
    // if (params.order_id) {
    data["merchant_transaction_id"] = obj.order_id;
    // }
    // else {
    // data["merchant_transaction_id"] = id;
    // }
    data["transaction_id"] = obj.transaction_id;
    return await prisma.$transaction(async (tx) => {
        try {
            return await tx.transaction.create({
                data: {
                    // order_id: obj.order_id,
                    ...data,
                    date_time: new Date(),
                    original_amount: obj.amount,
                    type: obj.type,
                    status: obj.status,
                    merchant_id: obj.merchant_id,
                    settled_amount: settledAmount,
                    balance: settledAmount,
                    providerDetails: obj.providerDetails,
                },
            });
        }
        catch (err) {
            throw new CustomError("Transaction not Created", 400);
        }
    });
};
const updateTxn = async (transaction_id, obj, duration) => {
    return await prisma.$transaction(async (tx) => {
        let transaction = await tx.transaction.update({
            where: {
                transaction_id: transaction_id,
            },
            data: {
                ...obj,
            },
        });
        const provider = await tx.provider.upsert({
            where: {
                name_txn_type_version: {
                    name: "EasyPaisa",
                    txn_type: "MA",
                    version: "",
                },
            },
            update: {},
            create: {
                name: "EasyPaisa",
                txn_type: "MA",
                version: "",
            },
        });
        if (obj.status == "completed") {
            const scheduledAt = addWeekdays(new Date(), duration); // Call the function to get the next 2 weekdays
            console.log(scheduledAt);
            let scheduledTask = await tx.scheduledTask.create({
                data: {
                    transactionId: transaction_id,
                    status: 'pending',
                    scheduledAt: scheduledAt, // Assign the calculated weekday date
                    executedAt: null, // Assume executedAt is null when scheduling
                }
            });
        }
    }, {
        timeout: 60000,
        maxWait: 60000
    });
};
async function switchPaymentProvider(merchantId, transactionId) {
    const transaction = await prisma.transaction.findUnique({
        where: { merchant_transaction_id: transactionId },
        include: {
            merchant: {
                select: {
                    id: true,
                }
            }
        }
    });
    if (!transaction?.merchant.id)
        throw new Error('Merchant not found');
    const merchant = await prisma.merchant.findUnique({
        where: { merchant_id: transaction.merchant.id }
    });
    if (!merchant)
        throw new Error('Merchant not found');
    let transactions = await prisma.transaction.aggregate({
        _sum: {
            original_amount: true,
        },
        where: {
            status: 'completed',
            merchant_id: transaction.merchant.id,
            providerDetails: {
                path: ["name"],
                equals: "Easypaisa"
            },
            createdAt: { gte: merchant?.lastSwich }, // From lastSwich date
        },
    });
    const usage = transactions._sum.original_amount || 0;
    console.log(`Usage: ${usage}, EasyPaisa Limit: ${merchant?.easypaisaLimit}, Switch Limit: ${merchant?.swichLimit}`);
    console.log(`Current Payment Method: ${merchant?.easypaisaPaymentMethod}`);
    console.log(`${usage} > (${merchant?.swichLimit} as Decimal)`, new Decimal(merchant?.easypaisaLimit).greaterThan(0) && new Decimal(usage).greaterThan(merchant?.easypaisaLimit));
    console.log(`${usage} > (${merchant?.easypaisaLimit} as Decimal)`, new Decimal(merchant?.swichLimit).greaterThan(0) && new Decimal(usage).greaterThan(merchant?.easypaisaLimit));
    if (merchant?.easypaisaPaymentMethod == "DIRECT") {
        if (new Decimal(merchant?.easypaisaLimit).greaterThan(0) && new Decimal(usage).greaterThan(merchant?.easypaisaLimit)) {
            await updateMerchantSwitch('SWITCH', merchant.merchant_id);
            return "switch";
        }
        else {
            return 'direct';
        }
    }
    else {
        if (new Decimal(merchant?.swichLimit).greaterThan(0) && new Decimal(usage).greaterThan(merchant?.easypaisaLimit)) {
            await updateMerchantSwitch('DIRECT', merchant?.merchant_id);
            return "direct";
        }
        else {
            return 'switch';
        }
    }
}
// Helper function to update the `lastSwich` field
async function updateMerchantSwitch(provider, merchantId) {
    await prisma.merchant.update({
        where: { merchant_id: merchantId },
        data: {
            easypaisaPaymentMethod: provider,
            lastSwich: new Date(), // Update last switch timestamp
        },
    });
    console.log(`Switched to ${provider} for merchant ID: ${merchantId}`);
}
const sendCallback = async (webhook_url, payload, msisdn, type, doEncryption, checkLimit) => {
    setTimeout(async () => {
        try {
            console.log("Callback Payload: ", payload);
            let data = JSON.stringify({
                "amount": payload.original_amount,
                "msisdn": msisdn,
                "time": payload.date_time,
                "order_id": payload.merchant_transaction_id,
                "status": "success",
                "type": type
            });
            if (doEncryption) {
                data = JSON.stringify(await callbackEncrypt(data, payload?.merchant_id));
            }
            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: webhook_url,
                headers: {
                    'Content-Type': 'application/json',
                },
                data: data
            };
            let res = await axios.request(config);
            if (res.data == "success") {
                console.log("Callback sent successfully");
                if (type == "payin") {
                    await prisma.transaction.update({
                        where: {
                            merchant_transaction_id: payload.merchant_transaction_id
                        },
                        data: {
                            callback_sent: true,
                            callback_response: res.data
                        }
                    });
                }
                else {
                    await prisma.disbursement.update({
                        where: {
                            merchant_custom_order_id: payload.merchant_transaction_id
                        },
                        data: {
                            callback_sent: true,
                            callback_response: res.data
                        }
                    });
                }
            }
            else {
                console.log("Error sending callback");
                if (type == "payin") {
                    await prisma.transaction.update({
                        where: {
                            merchant_transaction_id: payload.merchant_transaction_id
                        },
                        data: {
                            callback_sent: false,
                            callback_response: res?.data
                        }
                    });
                }
                else {
                    await prisma.disbursement.update({
                        where: {
                            merchant_custom_order_id: payload.merchant_transaction_id
                        },
                        data: {
                            callback_sent: false,
                            callback_response: res?.data
                        }
                    });
                }
            }
            if (checkLimit) {
                console.log(await switchPaymentProvider(payload.merchant_id, payload.merchant_transaction_id));
            }
        }
        catch (err) {
            return { "message": "Error calling callback" };
        }
    }, 10000);
};
function convertPhoneNumber(phoneNumber) {
    // Remove any '+' at the start of the number
    if (phoneNumber.startsWith("+92")) {
        return "0" + phoneNumber.slice(3);
    }
    else if (phoneNumber.startsWith("92")) {
        return "0" + phoneNumber.slice(2);
    }
    // Return the phone number unchanged if it doesn't start with '92' or '+92'
    return phoneNumber;
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
export default {
    createTransaction,
    completeTransaction,
    createTxn,
    updateTxn,
    createTransactionId,
    ...analyticsService,
    sendCallback,
    convertPhoneNumber,
    getMerchantChannel,
    getMerchantInquiryMethod,
    getTransaction
};
export { isValidTransactionCompletion, isValidTransactionRequest };
