import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PROVIDERS } from "constants/providers.js";
import { parseISO } from "date-fns";
import { format, toZonedTime } from "date-fns-tz";
import prisma from "prisma/client.js";
import { easyPaisaService, merchantService, transactionService } from "services/index.js";
import { getMerchantRate, getWalletBalance } from "services/paymentGateway/disbursement.js";
import jazzcashDisburse from "services/paymentGateway/jazzcashDisburse.js";
import CustomError from "utils/custom_error.js";
import { decryptData, encryptData } from "utils/enc_dec.js";
import fs from "fs";
import path from "path";
import * as csv from "fast-csv";
import { fileURLToPath } from "url";
function formatAmount(amount) {
    // Ensure the number is fixed to two decimal places
    return amount.toFixed(2);
}
function stringToBoolean(value) {
    return value.toLowerCase() === "true";
}
async function refundIBFTTransaction(token, body, merchantId) {
    let findMerchant;
    let walletBalance;
    let totalDisbursed = new Decimal(0);
    let balanceDeducted = false;
    let merchantAmount = new Decimal(0);
    let id = '';
    try {
        // validate Merchant
        findMerchant = await merchantService.findOne({
            uid: merchantId,
        });
        if (!findMerchant) {
            throw new CustomError("Merchant not found", 404);
        }
        if (!findMerchant.JazzCashDisburseAccountId) {
            throw new CustomError("Disbursement account not assigned.", 404);
        }
        let balance = await getWalletBalance(findMerchant?.merchant_id);
        walletBalance = balance.walletBalance;
        // find disbursement merchant
        const findDisbureMerch = await jazzcashDisburse
            .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
            .then((res) => res?.data);
        if (!findDisbureMerch) {
            throw new CustomError("Disbursement account not found", 404);
        }
        if (body.order_id) {
            const checkOrder = await prisma.refund.findFirst({
                where: {
                    merchant_custom_order_id: body.order_id,
                },
            });
            if (checkOrder) {
                throw new CustomError("Order ID already exists", 400);
            }
        }
        let totalCommission = new Decimal(0);
        let totalGST = new Decimal(0);
        let totalWithholdingTax = new Decimal(0);
        let amountDecimal = new Decimal(body.amount);
        merchantAmount = new Decimal(body.amount);
        totalDisbursed = new Decimal(0);
        id = transactionService.createTransactionId();
        let data2 = {};
        if (body.order_id) {
            data2["merchant_custom_order_id"] = body.order_id;
        }
        else {
            data2["merchant_custom_order_id"] = id;
        }
        data2["system_order_id"] = id;
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
                merchantAmount = body.amount
                    ? amountDecimal.plus(totalDeductions)
                    : amountDecimal.minus(totalDeductions);
                // Get eligible transactions
                if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
                    throw new CustomError("Insufficient balance to disburse", 400);
                }
                const result = await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, false);
                balanceDeducted = true;
                console.log(JSON.stringify({ event: "BALANCE_ADJUSTED", merchantId, deductedAmount: merchantAmount.toString(), id: id, order_id: body.order_id }));
            }
            catch (err) {
                if (err instanceof Prisma.PrismaClientKnownRequestError) {
                    if (err.code === 'P2034') {
                        throw new CustomError("Transaction is Pending! Retry Again", 202);
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
        let payload = encryptData({
            bankAccountNumber: body.iban,
            bankCode: body.bankCode,
            amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
            receiverMSISDN: body.phone,
            referenceId: id
        }, findDisbureMerch.key, findDisbureMerch.initialVector);
        let db_id = id;
        let requestData = {
            data: payload,
        };
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        // Example usage
        (async () => {
            await delay(1000); // Wait for 1 second
        })();
        let response = await fetch(`https://clownfish-app-rmhgo.ondigitalocean.app/jzd-ibft-i`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        let res = await response.json();
        let data;
        if (!res.data) {
            console.log(JSON.stringify({ event: "IBFT_INQUIRY_DATA_NOT_RECIEVED", response: res, id, order_id: body.order_id }));
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
            balanceDeducted = false;
            throw new CustomError("Transaction is Pending! Retry Again", 202);
        }
        data = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
        // console.log("Initiate Response: ", data)
        if (data.responseCode != "G2P-T-0") {
            console.log(JSON.stringify({ event: "IBFT_INQUIRY_ERROR", response: data, id, order_id: body.order_id }));
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
            data2["transaction_id"] = data.transactionID || db_id;
            // Get the current date
            const date = new Date();
            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';
            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            await prisma.refund.create({
                data: {
                    ...data2,
                    // transaction_id: id,
                    merchant_id: Number(findMerchant.merchant_id),
                    disbursementDate: zonedDate,
                    transactionAmount: amountDecimal,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount: body.amount ? body.amount : merchantAmount,
                    platform: 0,
                    account: body.iban,
                    provider: PROVIDERS.BANK,
                    status: "failed",
                    response_message: data.responseDescription,
                    reason: body?.reason
                },
            });
            balanceDeducted = false;
            throw new CustomError(data.responseDescription, 500);
        }
        id = transactionService.createTransactionId();
        console.log("Confirm Request: ", {
            "Init_transactionID": data.transactionID,
            "referenceID": id
        });
        payload = encryptData({
            "Init_transactionID": data.transactionID,
            "referenceID": id
        }, findDisbureMerch.key, findDisbureMerch.initialVector);
        console.log(JSON.stringify({ event: "TRANSACTION_CONFIRMED", initTransactionID: data.transactionID, referenceID: id, order_id: body.order_id, id }));
        requestData = {
            data: payload
        };
        // Example usage
        (async () => {
            await delay(1000); // Wait for 1 second
        })();
        response = await fetch(`https://clownfish-app-rmhgo.ondigitalocean.app/jzd-ibft-t`, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        res = await response.json();
        if (!res.data) {
            console.log(JSON.stringify({ event: "IBFT_PAYMENT_DATA_NOT_RECIEVED", response: res, id, order_id: body.order_id }));
            easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
            balanceDeducted = false;
            throw new CustomError("Transaction is Pending! Retry Again", 202);
        }
        res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
        // let res = {responseCode: "G2P-T-1",transactionID: "", responseDescription: "Failed"}
        if (res.responseCode != "G2P-T-0") {
            // console.log("IBFT Response: ", data);
            console.log(JSON.stringify({ event: "IBFT_PAYMENT_ERROR", response: res, id, order_id: body.order_id }));
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
            data2["transaction_id"] = res.transactionID || db_id;
            // Get the current date
            const date = new Date();
            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';
            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            await prisma.refund.create({
                data: {
                    ...data2,
                    // transaction_id: id,
                    merchant_id: Number(findMerchant.merchant_id),
                    disbursementDate: zonedDate,
                    transactionAmount: amountDecimal,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount: body.amount ? body.amount : merchantAmount,
                    platform: 0,
                    account: body.iban,
                    provider: PROVIDERS.BANK,
                    status: "failed",
                    response_message: res.responseDescription,
                    reason: body?.reason
                },
            });
            balanceDeducted = false;
            throw new CustomError(res.responseDescription, 500);
        }
        console.log(JSON.stringify({ event: "TRANSACTION_SUCCESS", transactionId: res.transactionID, merchantId, finalAmount: merchantAmount.toString(), id, order_id: body.order_id }));
        return await prisma.$transaction(async (tx) => {
            // Update transactions to adjust balances
            data2["transaction_id"] = res.transactionID;
            // }
            // Get the current date
            const date = new Date();
            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';
            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            // Create refund record
            let refund = await tx.refund.create({
                data: {
                    ...data2,
                    // transaction_id: id,
                    merchant_id: Number(findMerchant.merchant_id),
                    disbursementDate: zonedDate,
                    transactionAmount: amountDecimal,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount: body.amount ? body.amount : merchantAmount,
                    platform: 0,
                    account: body.iban,
                    provider: PROVIDERS.BANK,
                    status: "completed",
                    response_message: "success",
                    reason: body?.reason
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
                original_amount: body.amount ? body.amount : merchantAmount,
                date_time: zonedDate,
                merchant_transaction_id: refund.merchant_custom_order_id,
                merchant_id: findMerchant.merchant_id
            }, body.phone, "payout", stringToBoolean(findMerchant.encrypted), false);
            return {
                message: "Disbursement created successfully",
                merchantAmount: body.amount
                    ? body.amount.toString()
                    : merchantAmount.toString(),
                order_id: refund.merchant_custom_order_id,
                externalApiResponse: {
                    TransactionReference: refund.merchant_custom_order_id,
                    TransactionStatus: "success",
                },
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
            maxWait: 60000,
            timeout: 60000,
        });
    }
    catch (err) {
        // console.log("Initiate Transaction Error", err);
        console.log(JSON.stringify({ event: "TRANSACTION_ERROR", errorMessage: err?.message, statusCode: err?.statusCode || 500, id, order_id: body.order_id }));
        if (balanceDeducted) {
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
        }
        throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
    }
}
async function refundMwTransaction(token, body, merchantId) {
    let findMerchant;
    let walletBalance;
    let totalDisbursed = new Decimal(0);
    let balanceDeducted = false;
    let merchantAmount = new Decimal(0);
    let id = '';
    try {
        // validate Merchant
        findMerchant = await merchantService.findOne({
            uid: merchantId,
        });
        const balance = await getWalletBalance(findMerchant?.merchant_id);
        walletBalance = balance.walletBalance; // Get the wallet balance
        if (!findMerchant) {
            throw new CustomError("Merchant not found", 404);
        }
        if (!findMerchant.JazzCashDisburseAccountId) {
            throw new CustomError("Disbursement account not assigned.", 404);
        }
        // find disbursement merchant
        const findDisbureMerch = await jazzcashDisburse
            .getDisburseAccount(findMerchant.JazzCashDisburseAccountId)
            .then((res) => res?.data);
        if (!findDisbureMerch) {
            throw new CustomError("Disbursement account not found", 404);
        }
        // Phone number validation (must start with 92)
        if (!body.phone.startsWith("92")) {
            throw new CustomError("Number should start with 92", 400);
        }
        if (body.order_id) {
            const checkOrder = await prisma.refund.findFirst({
                where: {
                    merchant_custom_order_id: body.order_id,
                },
            });
            if (checkOrder) {
                throw new CustomError("Order ID already exists", 400);
            }
        }
        let totalCommission = new Decimal(0);
        let totalGST = new Decimal(0);
        let totalWithholdingTax = new Decimal(0);
        let amountDecimal = new Decimal(body.amount);
        merchantAmount = new Decimal(body.amount);
        let data = {};
        id = transactionService.createTransactionId();
        if (body.order_id) {
            data["merchant_custom_order_id"] = body.order_id;
        }
        else {
            data["merchant_custom_order_id"] = id;
        }
        data["system_order_id"] = id;
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
                merchantAmount = body.amount
                    ? amountDecimal.plus(totalDeductions)
                    : amountDecimal.minus(totalDeductions);
                // Get eligible transactions
                if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
                    throw new CustomError("Insufficient balance to disburse", 400);
                }
                const result = await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, false);
                balanceDeducted = true;
                console.log(JSON.stringify({ event: "BALANCE_ADJUSTED", id, amount: +merchantAmount.toString(), order_id: body.order_id })); // Adjust the balance
            }
            catch (err) {
                if (err instanceof Prisma.PrismaClientKnownRequestError) {
                    if (err.code === 'P2034') {
                        throw new CustomError("Transaction is Pending", 202);
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
        const payload = encryptData({
            receiverCNIC: body.cnic,
            receiverMSISDN: body.phone,
            amount: body.amount ? formatAmount(+body.amount) : formatAmount(+merchantAmount),
            referenceId: id
        }, findDisbureMerch.key, findDisbureMerch.initialVector);
        const requestData = {
            data: payload
        };
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        // Example usage
        (async () => {
            await delay(1000); // Wait for 1 second
        })();
        const response = await fetch(`https://clownfish-app-rmhgo.ondigitalocean.app/jzd-ma`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        let res = await response.json();
        if (!res.data) {
            console.log(JSON.stringify({ event: "MW_RESPONSE_DATA_NOT_RECIEVED", res, id, order_id: body.order_id }));
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
            balanceDeducted = false;
            throw new CustomError("Transaction is Pending", 202);
        }
        res = decryptData(res?.data, findDisbureMerch.key, findDisbureMerch.initialVector);
        // let res = {responseCode: "G2P-T-1",responseDescription: "Failed",transactionID: ""}
        if (res.responseCode != "G2P-T-0") {
            console.log(JSON.stringify({ event: "MW_PAYMENT_ERROR", res, id, order_id: body.order_id }));
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
            data["transaction_id"] = res?.transactionID || id;
            const date = new Date();
            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';
            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            await prisma.refund.create({
                data: {
                    ...data,
                    // transaction_id: id,
                    merchant_id: Number(findMerchant.merchant_id),
                    disbursementDate: zonedDate,
                    transactionAmount: amountDecimal,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount: body.amount ? body.amount : merchantAmount,
                    platform: 0,
                    account: body.phone,
                    provider: PROVIDERS.JAZZ_CASH,
                    status: "failed",
                    response_message: res.responseDescription,
                    reason: body?.reason
                },
            });
            balanceDeducted = false;
            throw new CustomError(res.responseDescription, 500);
        }
        console.log(JSON.stringify({ event: "MW_TRANSACTION_SUCCESS", id: id, order_id: body.order_id }));
        return await prisma.$transaction(async (tx) => {
            // Update transactions to adjust balances
            data["transaction_id"] = res.transactionID;
            // }
            // Get the current date
            const date = new Date();
            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';
            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            // Create refund record
            let refund = await tx.refund.create({
                data: {
                    ...data,
                    // transaction_id: id,
                    merchant_id: Number(findMerchant.merchant_id),
                    disbursementDate: zonedDate,
                    transactionAmount: amountDecimal,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount: body.amount ? body.amount : merchantAmount,
                    platform: 0,
                    account: body.phone,
                    provider: PROVIDERS.JAZZ_CASH,
                    status: "completed",
                    response_message: "success",
                    reason: body?.reason
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
                original_amount: body.amount ? body.amount : merchantAmount,
                date_time: zonedDate,
                merchant_transaction_id: refund.merchant_custom_order_id,
                merchant_id: findMerchant.merchant_id
            }, body.phone, "payout", stringToBoolean(findMerchant.encrypted), false);
            return {
                message: "refund created successfully",
                merchantAmount: body.amount
                    ? body.amount.toString()
                    : merchantAmount.toString(),
                order_id: refund.merchant_custom_order_id,
                externalApiResponse: {
                    TransactionReference: res.transactionID,
                    TransactionStatus: "success",
                },
            };
        }, {
            maxWait: 5000,
            timeout: 60000,
        });
    }
    catch (err) {
        // console.log("MW Transaction Error", err);
        console.log(JSON.stringify({ event: "MW_TRANSACTION_ERROR", message: err?.message, statusCode: err?.statusCode == 202 ? 202 : 500, id: id, order_id: body.order_id }));
        if (balanceDeducted) {
            await easyPaisaService.adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
        }
        throw new CustomError(err?.message, err?.statusCode == 202 ? 202 : 500);
    }
}
const getRefund = async (merchantId, params) => {
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
        if (params.reason) {
            customWhere["reason"] = { contains: params.reason };
        }
        let { page, limit } = params;
        // Query based on provided parameters
        let skip, take = 0;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page) - 1 : parseInt(page)) * parseInt(limit);
            take = parseInt(limit);
        }
        const disbursements = await prisma.refund
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
        const hasMore = disbursements.length > take;
        if (hasMore) {
            disbursements.pop(); // Remove the extra record
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.join(__dirname, "../../../files");
if (!fs.existsSync(EXPORT_DIR))
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
export const exportRefund = async (merchantId, params) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");
        const filters = { deletedAt: null };
        if (merchantId)
            filters["merchant_id"] = +merchantId;
        if (params.account)
            filters["account"] = { contains: params.account };
        if (params.transaction_id)
            filters["transaction_id"] = params.transaction_id;
        if (params.merchantTransactionId)
            filters["merchant_custom_order_id"] = params.merchantTransactionId;
        if (params.status)
            filters["status"] = params.status;
        if (params.reason)
            filters["reason"] = { contains: params.reason };
        if (startDate && endDate) {
            filters["disbursementDate"] = {
                gte: parseISO(startDate),
                lt: parseISO(endDate),
            };
        }
        const totalRecords = await prisma.refund.count({ where: filters });
        let remainingRecords = totalRecords;
        let processedCount = 0;
        let totalAmount = 0;
        console.log(`📊 Total refund records: ${totalRecords}`);
        const fileName = `refunds_${Date.now()}.csv`;
        const filePath = path.join(EXPORT_DIR, fileName);
        const fileStream = fs.createWriteStream(filePath);
        const csvStream = csv.format({ headers: true });
        csvStream.pipe(fileStream);
        const timeZone = "Asia/Karachi";
        const pageSize = 1000;
        let lastCursor = undefined;
        let hasMore = true;
        while (hasMore) {
            const batch = await prisma.refund.findMany({
                where: filters,
                orderBy: { id: "asc" },
                cursor: lastCursor ? { id: lastCursor } : undefined,
                skip: lastCursor ? 1 : 0,
                take: pageSize,
                include: {
                    merchant: {
                        select: {
                            uid: true,
                            full_name: true,
                        },
                    },
                },
            });
            console.log(`🔄 Fetched batch: ${batch.length}`);
            remainingRecords -= batch.length;
            for (const txn of batch) {
                totalAmount += Number(txn.merchantAmount || 0);
                csvStream.write({
                    merchant: txn.merchant?.full_name || "",
                    account: txn.account,
                    transaction_id: txn.transaction_id,
                    merchant_order_id: txn.merchant_custom_order_id,
                    disbursement_date: format(toZonedTime(txn.disbursementDate, timeZone), 'yyyy-MM-dd HH:mm:ss', { timeZone }),
                    transaction_amount: txn.transactionAmount,
                    commission: txn.commission,
                    gst: txn.gst,
                    withholding_tax: txn.withholdingTax,
                    merchant_amount: txn.merchantAmount,
                    status: txn.status,
                    provider: txn.provider,
                    callback_sent: txn.callback_sent,
                    reason: txn.reason || "",
                });
                lastCursor = txn.id;
                processedCount++;
            }
            console.log(`📦 Processed: ${processedCount} | Remaining: ${remainingRecords} | Settled: ${totalAmount.toFixed(2)}`);
            hasMore = batch.length === pageSize;
        }
        // Final footer row
        await new Promise(resolve => csvStream.end(resolve));
        fs.appendFileSync(filePath, `\nTotal Settled Amount,,${totalAmount.toFixed(2)}`);
        console.log(`✅ Refund CSV saved: ${filePath}`);
        return {
            filePath,
            downloadUrl: `https://server2.sahulatpay.com/files/${fileName}`,
            totalRecords: processedCount,
            totalAmount: totalAmount.toFixed(2),
        };
    }
    catch (error) {
        console.error("❌ Refund export failed:", error);
        throw new CustomError(error?.error || "Unable to export refund data", error?.statusCode || 500);
    }
};
export default {
    refundIBFTTransaction,
    refundMwTransaction,
    getRefund,
    exportRefund
};
