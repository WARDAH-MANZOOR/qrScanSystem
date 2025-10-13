import jwt from "jsonwebtoken";
import CustomError from "./custom_error.js";
import prisma from "../prisma/client.js";
import ApiResponse from "../utils/ApiResponse.js";
import { OTP_VERIFY_MAX_ATTEMPTS } from "constants/otp.js";
import { normalizeE164 } from "./phone.js";
import { transactionService } from "services/index.js";
import { PROVIDERS } from "constants/providers.js";
const isLoggedIn = async (req, res, next) => {
    try {
        // Check if the token exists
        if (!req.cookies.token) {
            res.status(401).send("You must be logged in");
            return;
        }
        // Verify the JWT token
        const data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        // Attach the user data to req.user
        req.user = data;
        // Proceed to the next middleware
        return next();
    }
    catch (error) {
        res.status(401).json(ApiResponse.error("You must be logged in", 401));
    }
};
const checkOtp = async (req, res, next) => {
    try {
        const { accountNo, provider, payId, otp, challengeId } = req.body;
        const c = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
        if (!c) {
            res.status(404).json({ ok: false, status: 404, reason: "not_found" });
            return;
        }
        if (c?.status == "verified") {
            return next();
        }
        if (c?.status !== "pending") {
            res.status(409).json({ ok: false, status: 409, reason: "not_active" });
            return;
        }
        // Verify the otp
        const record = await prisma.paymentRequest.findFirst({
            where: {
                AND: [
                    {
                        metadata: {
                            path: ["otp"],
                            equals: otp
                        }
                    },
                    {
                        metadata: {
                            path: ["phone"],
                            equals: accountNo
                        }
                    }
                ]
            }
        });
        if (!record) {
            const updated = await prisma.otpChallenge.update({
                where: { id: c?.id },
                data: { verifyAttempts: { increment: 1 } }
            });
            if (updated.verifyAttempts >= OTP_VERIFY_MAX_ATTEMPTS || updated.sendCount >= OTP_VERIFY_MAX_ATTEMPTS) {
                await prisma.otpChallenge.update({ where: { id: c?.id }, data: { status: "blocked" } });
                await prisma.failedAttempt.createMany({
                    data: [{
                            phoneNumber: c?.phoneE164,
                            failedAt: new Date()
                        },
                        {
                            phoneNumber: c?.phoneE164,
                            failedAt: new Date()
                        },
                        {
                            phoneNumber: c?.phoneE164,
                            failedAt: new Date()
                        },
                        {
                            phoneNumber: c?.phoneE164,
                            failedAt: new Date()
                        },
                        {
                            phoneNumber: c?.phoneE164,
                            failedAt: new Date()
                        }]
                });
                const transactionLocation = await prisma.transactionLocation.findUnique({
                    where: {
                        challengeId: challengeId
                    }
                });
                const txn = await prisma.transaction.findUnique({
                    where: {
                        transaction_id: transactionLocation?.transactionId
                    }
                });
                const merchant = await prisma.merchant.findUnique({
                    where: {
                        merchant_id: txn?.merchant_id
                    },
                    include: {
                        commissions: true
                    }
                });
                await transactionService.updateTxn(txn?.transaction_id, {
                    status: "failed",
                    response_message: "OTP Verification Failed",
                    providerDetails: {
                        id: merchant?.easyPaisaMerchantId,
                        name: PROVIDERS.EASYPAISA,
                        msisdn: c?.phoneE164,
                        deduction: 6,
                        deductionDone: false
                    }
                }, merchant?.commissions[0].settlementDuration);
            }
            res.status(401).send("Invalid OTP");
            return;
        }
        // Proceed to the next middleware
        req.body.attempts = c?.sendCount;
        await prisma.$transaction([
            prisma.otpChallenge.update({ where: { id: c?.id }, data: { status: "verified", verifiedAt: new Date() } }),
            prisma.providerFirstSeen.upsert({
                where: { provider_phoneE164: { provider: "EASYPAISA", phoneE164: c?.phoneE164 } },
                create: { provider: "EASYPAISA", phoneE164: c?.phoneE164 },
                update: {}
            })
        ]);
        return next();
    }
    catch (error) {
        console.log(error);
        res.status(401).json(ApiResponse.error("Invalid otp or phone mapping", 401));
    }
};
const restrict = (role) => {
    return (req, res, next) => {
        let user = req.user;
        if (user?.role !== role) {
            const error = new CustomError("You are forbidden to perform this action", 403);
            return next(error);
        }
        next();
    };
};
const restrictMultiple = (...role) => {
    return (req, res, next) => {
        let user = req.user;
        if (!role.includes(user?.role)) {
            const error = new CustomError("You are forbidden to perform this action", 403);
            return next(error);
        }
        next();
    };
};
const errorHandler = (err, req, res, next) => {
    // Check if the response headers have already been sent
    if (res.headersSent) {
        return next(err); // Delegate to the default Express error handler
    }
    // Handle operational errors (CustomError)
    if (err.isOperational) {
        console.log("Operational Error:", err.statusCode, err.message);
        res.status(err.statusCode).json({
            statusText: err.statusText,
            status: err.statusCode,
            message: err.message,
        });
        return;
    }
    // Log non-operational or unknown errors for debugging
    console.error("An unexpected error occurred:", err);
    // Send a generic error response
    res.status(500).json({
        status: "error",
        message: "Something went wrong",
    });
};
const authorize = (permissionName) => {
    return async (req, res, next) => {
        const userId = req.user?.id; // Assume user ID is set in req.user
        const userGroups = await prisma.userGroup.findMany({
            where: { userId },
            include: { group: { include: { permissions: true } } },
        });
        const permission = await prisma.permission.findFirst({
            where: { name: permissionName },
        });
        const hasPermission = userGroups.some((group) => group.group.permissions.some((permission2) => permission2.permissionId === permission?.id));
        if (!hasPermission) {
            res.status(403).json({ message: "Forbidden" });
            return;
        }
        next();
    };
};
const isAdmin = async (req, res, next) => {
    if (req.user?.role === "Admin") {
        return next(); // Correctly calls the next middleware
    }
    res.status(403).json(ApiResponse.error("You are not authorized to perform this action", 403));
};
const blockPhoneMiddleware = async (req, res, next) => {
    const phone = req.body.phone || req.body.accountNo;
    let normalizedPhone = normalizeE164(phone);
    if (!phone) {
        res.status(400).json({ message: 'Phone number required' });
        return;
    }
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const attempts = await prisma.failedAttempt.count({
        where: {
            OR: [
                {
                    phoneNumber: phone
                },
                {
                    phoneNumber: normalizedPhone
                }
            ],
            failedAt: {
                gte: oneHourAgo,
            },
        },
    });
    if (attempts >= 5) {
        res.status(429).json({ message: 'Too many failed attempts. Phone number is temporarily blocked for 1 hour.' });
        return;
    }
    next();
};
export { isLoggedIn, restrict, errorHandler, restrictMultiple, authorize, isAdmin, checkOtp, blockPhoneMiddleware };
