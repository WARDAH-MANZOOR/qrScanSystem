import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import ApiResponse from "./ApiResponse.js";
import { decryptAESGCM, deriveKeys, generateHMACSignature } from "./dec_with_signing.js";
const blockPhoneNumberNew = async (req, res, next) => {
    try {
        const { userId, timestamp, encrypted_data, iv, tag, signature } = req.body;
        if (!userId || !timestamp || !encrypted_data || !iv || !tag || !signature) {
            res.status(400).json(ApiResponse.error("Missing encryption fields"));
            return;
        }
        const masterKey = Buffer.from(process.env.MASTER_SECRET_KEY, 'utf8');
        const { hmacKey, aesKey } = deriveKeys(masterKey);
        const expectedSignature = generateHMACSignature(userId + timestamp + encrypted_data, hmacKey);
        if (signature !== expectedSignature) {
            res.status(403).json(ApiResponse.error("Invalid signature"));
            return;
        }
        const now = Date.now();
        const requestTime = new Date(timestamp).getTime();
        if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
            res.status(408).json(ApiResponse.error("Request expired"));
            return;
        }
        const decryptedStr = decryptAESGCM(encrypted_data, aesKey, iv, tag);
        const decryptedPayload = JSON.parse(decryptedStr);
        // Logging decrypted payload for debugging
        console.log("🔍 Decrypted Payload:", decryptedPayload);
        const phoneToCheck = decryptedPayload.phone || decryptedPayload.accountNo;
        if (!phoneToCheck) {
            res.status(400).json(ApiResponse.error("Missing phone or account number in payload"));
            return;
        }
        const isBlocked = await prisma.blockedPhoneNumbers.findUnique({
            where: { phoneNumber: phoneToCheck }
        });
        if (isBlocked) {
            const merchant = await prisma.merchant.findFirst({
                where: { uid: req.params.merchantId },
                include: { commissions: true }
            });
            const txnId = transactionService.createTransactionId();
            const orderId = decryptedPayload.order_id || txnId;
            await transactionService.createTxn({
                order_id: orderId,
                transaction_id: txnId,
                amount: decryptedPayload.amount,
                status: "failed",
                type: decryptedPayload.type,
                merchant_id: merchant?.merchant_id || 0,
                commission: 0,
                settlementDuration: merchant?.commissions[0]?.settlementDuration || 1,
                providerDetails: { msisdn: decryptedPayload.phone },
                response_message: "Number Blocked"
            });
            res.status(401).json(ApiResponse.error("Number is Blocked for Fraud Transaction", 401));
            return;
        }
        // Attach decryptedPayload to request object for use in controller
        req.body.decryptedPayload = decryptedPayload;
        next();
    }
    catch (error) {
        console.error("🛑 Middleware error:", error);
        res.status(500).json(ApiResponse.error("Middleware error: Block check failed", 500));
        return;
    }
};
const blockPhoneNumber = async (req, res, next) => {
    try {
        let findMerchant = await prisma.merchant.findFirst({
            where: {
                uid: req.params.merchantId
            },
            include: {
                commissions: true
            }
        });
        if (!findMerchant) {
            res.status(500).send("Merchant Not Found");
            return;
        }
        const data = await prisma.blockedPhoneNumbers.findUnique({
            where: {
                phoneNumber: req.body.phone || req.body.accountNo
            }
        });
        if (data) {
            let id = transactionService.createTransactionId();
            let id2 = req.body.order_id || id;
            await transactionService.createTxn({
                order_id: id2,
                transaction_id: id,
                amount: req.body.amount,
                status: "failed",
                type: req.body.type,
                merchant_id: findMerchant.merchant_id,
                commission: 0,
                settlementDuration: findMerchant.commissions[0].settlementDuration,
                providerDetails: {
                    msisdn: req.body.phone
                },
                response_message: "Number Blocked"
            });
            res.status(500).send(ApiResponse.error("Number is Blocked for Fraud Transaction", 500));
            return;
        }
        // Proceed to the next middleware
        return next();
    }
    catch (error) {
        res.status(401).json(ApiResponse.error("Number is Blocked for Fraud Transaction", 401));
    }
};
const blockPhoneNumberInRedirection = async (req, res, next) => {
    try {
        const paymentRequest = await prisma.paymentRequest.findFirst({
            where: {
                id: req.body.payId,
                deletedAt: null,
            },
        });
        if (!paymentRequest) {
            res.status(500).send(ApiResponse.error("Payment request not found"));
            return;
        }
        if (!paymentRequest.userId) {
            res.status(500).send(ApiResponse.error("User not found"));
            return;
        }
        // find merchant by user id because merchant and user are the same
        const merchant = await prisma.merchant.findFirst({
            where: {
                merchant_id: paymentRequest.userId,
            },
            include: {
                commissions: true
            }
        });
        if (!merchant || !merchant.uid) {
            res.status(500).send(ApiResponse.error("Merchant not found"));
            return;
        }
        const data = await prisma.blockedPhoneNumbers.findUnique({
            where: {
                phoneNumber: req.body.accountNo
            }
        });
        if (data) {
            let id = transactionService.createTransactionId();
            let id2 = req.body.order_id || id;
            res.status(500).send(ApiResponse.error("Number is Blocked for Fraud Transaction", 500));
            return;
        }
        // Proceed to the next middleware
        return next();
    }
    catch (error) {
        res.status(401).json(ApiResponse.error("Number is Blocked for Fraud Transaction", 401));
    }
};
export default { blockPhoneNumber, blockPhoneNumberInRedirection, blockPhoneNumberNew };
