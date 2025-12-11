import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
import {
  jazzCashService,
  easyPaisaService,
  swichService,
  transactionService,
  payfast,
} from "../../services/index.js";
import { updateWooOrderStatus } from "../ipn/index.js";
import { encryptUtf } from "utils/enc_dec.js";
import { PROVIDERS } from "constants/providers.js";
import { Decimal, JsonObject } from "@prisma/client/runtime/library";

const createPaymentRequest = async (data: any, user: any) => {
  try {
    if (user.role !== "Merchant") {
      throw new CustomError("Only merchants can create payment requests", 403);
    }

    if (!user.id) {
      throw new CustomError("User not found", 400);
    }

    const newPaymentRequest = await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.create({
        data: {
          userId: user.id,
          amount: data.amount,
          status: "pending",
          email: data.store_name || data.email,
          description: data.description,
          transactionId: data.transactionId,
          dueDate: data.dueDate,
          provider: data.provider,
          link: data.link,
          metadata: data.metadata || {return_url: data.link},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });

    // update link with payment request id
    const updatedPaymentRequest = await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.update({
        where: {
          id: newPaymentRequest.id,
        },
        data: {
          link: `/pay/${newPaymentRequest.id}`,
        },
      });
    });

    if (!newPaymentRequest) {
      throw new CustomError(
        "An error occurred while creating the payment request",
        500
      );
    }

    return {
      message: "Payment request created successfully",
      data: { ...updatedPaymentRequest, completeLink: `https://merchant.sahulatpay.com/pay/${newPaymentRequest.id}`, return_url: (newPaymentRequest.metadata as JsonObject)?.return_url },
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while creating the payment request",
      error?.statusCode || 500
    );
  }
};

const createPaymentRequestClone = async (data: any, user: any) => {
  try {
    if (!user) {
      throw new CustomError("User Id not given", 404);
    }

    let user2 = await prisma.merchant.findFirst({
      where: {
        uid: user
      }
    })

    const findMerchant = await prisma.merchant.findFirst({
      where: {
        uid: user as string
      },
      include: {
        commissions: true
      }
    })

    

    let commission;
    if (findMerchant?.commissions[0].commissionMode == "SINGLE") {
      commission = +findMerchant?.commissions[0].commissionGST +
        +findMerchant?.commissions[0].commissionRate +
        +findMerchant?.commissions[0].commissionWithHoldingTax
    }
    else {
      commission = +(findMerchant?.commissions[0].commissionGST ?? 0) +
        +(findMerchant?.commissions[0]?.easypaisaRate ?? 0) +
        +(findMerchant?.commissions[0].commissionWithHoldingTax ?? 0)
    }
    let id = transactionService.createTransactionId();
    let id2 = data?.order_id || id;
    const transaction = await prisma.transaction.findUnique({
      where: {
        merchant_transaction_id: id2
      }
    })
    const transaction2 = await prisma.paymentRequest.findUnique({
      where: {
        merchant_transaction_id: id2
      }
    })

    if (transaction || transaction2) {
      return {
        message: 'Order Id already exists',
        data: {},
        status: 400
      }
    }
    const newPaymentRequest = await prisma.$transaction(async (tx) => {
      const txn = await transactionService.createTxn({
        order_id: id2,
        transaction_id: id,
        amount: data.amount,
        status: "pending",
        type: "wallet",
        merchant_id: user2?.merchant_id,
        commission,
        settlementDuration: findMerchant?.commissions[0].settlementDuration,
        providerDetails: {
          msisdn: data.phone,
        },
      })
      const paymentRequest = await tx.paymentRequest.create({
        data: {
          userId: user2?.merchant_id,
          amount: data.amount,
          status: "pending",
          email: data.store_name || data.email,
          description: data.description,
          transactionId: id,
          dueDate: data.dueDate,
          provider: data.provider,
          link: data.link,
          metadata: data.metadata || { phone: data.phone },
          createdAt: new Date(),
          updatedAt: new Date(),
          merchant_transaction_id: data.order_id,
        },
      });
      await tx.transaction.update({
        where: {
          merchant_transaction_id: id2
        },
        data: {
          providerDetails: {
            ...txn.providerDetails as JsonObject,
            payId: paymentRequest?.id
          }
        }
      })

      return paymentRequest;
    });

    // update link with payment request id
    const updatedPaymentRequest = await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.update({
        where: {
          id: newPaymentRequest.id,
        },
        data: {
          link: `/pay/${newPaymentRequest.id}`,
        },
      });
    });

    if (!newPaymentRequest) {
      throw new CustomError(
        "An error occurred while creating the payment request",
        500
      );
    }

    return {
      message: "Payment request created successfully",
      data: { ...updatedPaymentRequest, completeLink: `https://merchant.sahulatpay.com/pay/${newPaymentRequest.id}`, storeName: data.storeName, order_id: data.order_id, return_url: (newPaymentRequest.metadata as JsonObject)?.return_url },
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while creating the payment request",
      error?.statusCode || 500
    );
  }
};

const createPaymentRequestWithOtp = async (data: any, user: any) => {
  try {
    if (!user) {
      throw new CustomError("User Id not given", 404);
    }

    let user2 = await prisma.merchant.findFirst({
      where: {
        uid: user
      }
    })

    if (user2?.easypaisaPaymentMethod == "DIRECT" && !user2?.easyPaisaMerchantId) {
      throw new CustomError("Merchant not Found", 404)
    }

    if (user2?.easypaisaPaymentMethod == "PAYFAST" && !user2?.payFastMerchantId) {
      throw new CustomError("Merchant not Found", 404)
    }

    const findMerchant = await prisma.merchant.findFirst({
      where: {
        uid: user as string
      },
      include: {
        commissions: true
      }
    })

    // اگر findMerchant یا اس کی easypaisaMinAmtLimit موجود نہ ہو تو ایرر پھینکیں
    if (findMerchant?.easypaisaMinAmtLimit != null) {
      if (new Decimal(data.amount).lt(findMerchant.easypaisaMinAmtLimit)) {
        throw new CustomError("Amount is less than merchant's easypaisa limit", 400);
      }
    }

    

    let commission;
    if (findMerchant?.commissions[0].commissionMode == "SINGLE") {
      commission = +findMerchant?.commissions[0].commissionGST +
        +findMerchant?.commissions[0].commissionRate +
        +findMerchant?.commissions[0].commissionWithHoldingTax
    }
    else {
      commission = +(findMerchant?.commissions[0].commissionGST ?? 0) +
        +(findMerchant?.commissions[0]?.easypaisaRate ?? 0) +
        +(findMerchant?.commissions[0].commissionWithHoldingTax ?? 0)
    }
    let id = transactionService.createTransactionId();
    let id2 = data?.order_id || id;
    const transaction = await prisma.transaction.findUnique({
      where: {
        merchant_transaction_id: id2
      }
    })
    const transaction2 = await prisma.paymentRequest.findUnique({
      where: {
        merchant_transaction_id: id2
      }
    })

    if (transaction || transaction2) {
      return {
        message: 'Order Id already exists',
        data: {},
        status: 400
      }
    }
    const newPaymentRequest = await prisma.$transaction(async (tx) => {
      const txn = await transactionService.createTxn({
        order_id: id2,
        transaction_id: id,
        amount: data.amount,
        status: "pending",
        type: "wallet",
        merchant_id: user2?.merchant_id,
        commission,
        settlementDuration: findMerchant?.commissions[0].settlementDuration,
        providerDetails: {
          id: findMerchant?.easyPaisaMerchantId,
          name: PROVIDERS.EASYPAISA,
          msisdn: data.phone,
        },
      })
      const paymentRequest = await tx.paymentRequest.create({
        data: {
          userId: user2?.merchant_id,
          amount: data.amount,
          status: "pending",
          email: data.store_name || data.email,
          description: data.description,
          transactionId: id,
          dueDate: data.dueDate,
          provider: data.provider,
          link: data.link,
          metadata: data.metadata || { phone: data.phone },
          createdAt: new Date(),
          updatedAt: new Date(),
          merchant_transaction_id: data.order_id,
        },
      });
      await tx.transaction.update({
        where: {
          merchant_transaction_id: id2
        },
        data: {
          providerDetails: {
            ...txn.providerDetails as JsonObject,
            payId: paymentRequest?.id
          }
        }
      })

      return paymentRequest;
    });

    // update link with payment request id
    const updatedPaymentRequest = await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.update({
        where: {
          id: newPaymentRequest.id,
        },
        data: {
          link: `/pay-ep/${newPaymentRequest.id}`,
        },
      });
    });

    if (!newPaymentRequest) {
      throw new CustomError(
        "An error occurred while creating the payment request",
        500
      );
    }

    return {
      message: "Payment request created successfully",
      data: { ...updatedPaymentRequest, completeLink: `https://merchant.sahulatpay.com/pay-ep/${newPaymentRequest.id}`, storeName: data.storeName, order_id: data.order_id, return_url: (newPaymentRequest.metadata as JsonObject)?.return_url },
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while creating the payment request",
      error?.statusCode || 500
    );
  }
};

const createPaymentRequestWithOtpClone = async (data: any, user: any) => {
  try {
    if (!user) {
      throw new CustomError("User Id not given", 404);
    }

    let user2 = await prisma.merchant.findFirst({
      where: {
        uid: user
      }
    })

    if (user2?.easypaisaPaymentMethod == "DIRECT" && !user2?.easyPaisaMerchantId) {
      throw new CustomError("Merchant not Found", 404)
    }

    if (user2?.easypaisaPaymentMethod == "PAYFAST" && !user2?.payFastMerchantId) {
      throw new CustomError("Merchant not Found", 404)
    }

    const findMerchant = await prisma.merchant.findFirst({
      where: {
        uid: user as string
      },
      include: {
        commissions: true
      }
    })

    let commission;
    if (findMerchant?.commissions[0].commissionMode == "SINGLE") {
      commission = +findMerchant?.commissions[0].commissionGST +
        +findMerchant?.commissions[0].commissionRate +
        +findMerchant?.commissions[0].commissionWithHoldingTax
    }
    else {
      commission = +(findMerchant?.commissions[0].commissionGST ?? 0) +
        +(findMerchant?.commissions[0]?.easypaisaRate ?? 0) +
        +(findMerchant?.commissions[0].commissionWithHoldingTax ?? 0)
    }
    let id = transactionService.createTransactionId();
    let id2 = data?.order_id || id;
    const transaction = await prisma.transaction.findUnique({
      where: {
        merchant_transaction_id: id2
      }
    })
    const transaction2 = await prisma.paymentRequest.findUnique({
      where: {
        merchant_transaction_id: id2
      }
    })

    if (transaction || transaction2) {
      return {
        message: 'Order Id already exists',
        data: {},
        status: 400
      }
    }
    const newPaymentRequest = await prisma.$transaction(async (tx) => {
      const txn = await transactionService.createTxn({
        order_id: id2,
        transaction_id: id,
        amount: data.amount,
        status: "pending",
        type: "wallet",
        merchant_id: user2?.merchant_id,
        commission,
        settlementDuration: findMerchant?.commissions[0].settlementDuration,
        providerDetails: {
          msisdn: data.phone,
        },
      })
      const paymentRequest = await tx.paymentRequest.create({
        data: {
          userId: user2?.merchant_id,
          amount: data.amount,
          status: "pending",
          email: data.store_name || data.email,
          description: data.description,
          transactionId: id,
          dueDate: data.dueDate,
          provider: data.provider,
          link: data.link,
          metadata: data.metadata || { phone: data.phone, return_url: data.link },
          createdAt: new Date(),
          updatedAt: new Date(),
          merchant_transaction_id: data.order_id,
        },
      });
      await tx.transaction.update({
        where: {
          merchant_transaction_id: id2
        },
        data: {
          providerDetails: {
            ...txn.providerDetails as JsonObject,
            payId: paymentRequest?.id
          }
        }
      })

      return paymentRequest;
    });

    // update link with payment request id
    const updatedPaymentRequest = await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.update({
        where: {
          id: newPaymentRequest.id,
        },
        data: {
          link: `/redirect-payments/${newPaymentRequest.id}`,
        },
      });
    });

    if (!newPaymentRequest) {
      throw new CustomError(
        "An error occurred while creating the payment request",
        500
      );
    }

    return {
      message: "Payment request created successfully",
      data: { ...updatedPaymentRequest, completeLink: `https://merchant.sahulatpay.com/redirect-payments/${newPaymentRequest.id}`, storeName: data.storeName, order_id: data.order_id, return_url: (newPaymentRequest.metadata as JsonObject).return_url },
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while creating the payment request",
      error?.statusCode || 500
    );
  }
};

const payRequestedPayment = async (paymentRequestObj: any) => {
  try {
    const paymentRequest = await prisma.paymentRequest.findFirst({
      where: {
        id: paymentRequestObj.payId,
        deletedAt: null,
      },
    });

    if (!paymentRequest) {
      throw new CustomError("Payment request not found", 404);
    }

    // Check if payment request is failed
    if (paymentRequest.status === "failed") {
      throw new CustomError("Payment link has been expired", 400);
    }

    if (!paymentRequest.userId) {
      throw new CustomError("User not found", 404);
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
      throw new CustomError("Merchant not found", 404);
    }
    console.log(merchant?.easypaisaPaymentMethod)
    let response;

    console.log(paymentRequest.merchant_transaction_id, !paymentRequest.transactionId)
    if (paymentRequestObj.provider?.toLocaleLowerCase() === "jazzcash") {
      console.log("Reached")
      const jazzCashPayment = await jazzCashService.initiateJazzCashPaymentForRedirection(
        {
          order_id: paymentRequest.merchant_transaction_id || paymentRequest.transactionId,
          amount: paymentRequest.amount,
          type: "wallet",
          phone: paymentRequestObj.accountNo || (paymentRequest?.metadata as JsonObject)?.phone,
          redirect_url: paymentRequest.link,
        },
        merchant.uid
      );
      if (jazzCashPayment.statusCode != "000") {
        console.log(jazzCashPayment)
        throw new CustomError(
          jazzCashPayment.message,
          500
        );
      }
    } else if (
      paymentRequestObj.provider?.toLocaleLowerCase() === "easypaisa"
    ) {
      if (merchant.easypaisaPaymentMethod === "DIRECT") {
        // easypaisa payment
        let easyPaisaPayment;
        if (paymentRequest.merchant_transaction_id == null && !paymentRequest.transactionId) {
          easyPaisaPayment = await easyPaisaService.initiateEasyPaisa(
            merchant.uid,
            {
              order_id: paymentRequest.merchant_transaction_id,
              amount: paymentRequest.amount,
              type: "wallet",
              phone: paymentRequestObj.accountNo || (paymentRequest?.metadata as JsonObject)?.phone,
              email: "example@example.com",
              // orderId: `SPAY-PR-${paymentRequest.id}`,
              attempts: paymentRequestObj.attempts,
              challengeId: paymentRequestObj.challengeId
            }
          );
        }
        else {
          easyPaisaPayment = await easyPaisaService.initiateEasyPaisaForRedirection(
            merchant.uid,
            {
              order_id: paymentRequest.merchant_transaction_id || paymentRequest.transactionId,
              amount: paymentRequest.amount,
              type: "wallet",
              phone: paymentRequestObj.accountNo || (paymentRequest?.metadata as JsonObject)?.phone,
              email: "example@example.com",
              // orderId: `SPAY-PR-${paymentRequest.id}`,
              attempts: paymentRequestObj.attempts,
              challengeId: paymentRequestObj.challengeId
            }
          );
        }

        if (paymentRequestObj?.challengeId) {
          await prisma.transactionLocation.updateMany({
            where: { challengeId: paymentRequestObj?.challengeId },
            data: { transactionId: easyPaisaPayment.txnNo }
          });
        }

        if (easyPaisaPayment.statusCode != "0000") {
          throw new CustomError(
            easyPaisaPayment.message,
            500
          );
        }
      } else if (merchant.easypaisaPaymentMethod == "SWITCH") {
        // swich payment
        const swichPayment = await swichService.initiateSwich(
          {
            order_id: paymentRequest.merchant_transaction_id,
            channel: 1749,
            amount: paymentRequest.amount,
            phone: transactionService.convertPhoneNumber(paymentRequestObj.accountNo) || transactionService.convertPhoneNumber((paymentRequest?.metadata as JsonObject)?.phone as string),
            email: paymentRequest.email,
            // order_id: `SPAY-PR-${paymentRequest.id}`,
            type: "wallet",
          },
          merchant.uid
        );

        if (swichPayment?.statusCode != "0000") {
          throw new CustomError(
            swichPayment.message,
            500
          );
        }
      }
      else {
        const token = await payfast.getApiToken(merchant.uid, {});
        if (!token?.token) {
          console.log(JSON.stringify({ event: "PAYFAST_PAYIN_NO_TOKEN_RECIEVED", order_id: paymentRequest.merchant_transaction_id }))
          throw new CustomError("No Token Recieved", 500);
        }
        const validation = await payfast.validateCustomerInformation(merchant.uid, {
          token: token?.token,
          bankCode: '32',
          order_id: paymentRequest.merchant_transaction_id,
          phone: transactionService.convertPhoneNumber(paymentRequestObj.accountNo) || transactionService.convertPhoneNumber((paymentRequest?.metadata as JsonObject)?.phone as string),
          amount: paymentRequest.amount,
          email: paymentRequest.email
        })
        if (paymentRequestObj?.challengeId) {
          await prisma.transactionLocation.updateMany({
            where: { challengeId: paymentRequestObj?.challengeId },
            data: { transactionId: validation.txnNo2 }
          });
        }
        if (!validation?.transaction_id) {
          await prisma.failedAttempt.create({ data: { phoneNumber: paymentRequestObj.accountNo } });
          console.log(JSON.stringify({ event: "PAYFAST_PAYIN_VALIDATION_FAILED", order_id: paymentRequest.merchant_transaction_id }))
          throw new CustomError(validation.response_message, 500)
          // return;
        }
        let payfastPayment;
        if (!paymentRequest.merchant_transaction_id || !paymentRequest.transactionId) {
          payfastPayment = await payfast.pay(merchant.uid, {
            token: token?.token,
            bankCode: '32',
            transaction_id: validation?.transaction_id,
            order_id: paymentRequest.merchant_transaction_id,
            phone: transactionService.convertPhoneNumber(paymentRequestObj.accountNo) || transactionService.convertPhoneNumber((paymentRequest?.metadata as JsonObject)?.phone as string),
            amount: paymentRequest.amount,
            email: paymentRequest.email,
            attempts: paymentRequestObj.attempts,
            challengeId: paymentRequestObj.challengeId
          });
        }
        else {
          payfastPayment = await payfast.payForRedirection(merchant.uid, {
            token: token?.token,
            bankCode: '32',
            transaction_id: validation?.transaction_id,
            order_id: paymentRequest.merchant_transaction_id,
            phone: transactionService.convertPhoneNumber(paymentRequestObj.accountNo) || transactionService.convertPhoneNumber((paymentRequest?.metadata as JsonObject)?.phone as string),
            amount: paymentRequest.amount,
            email: paymentRequest.email,
            attempts: paymentRequestObj.attempts,
            challengeId: paymentRequestObj.challengeId
          });
        }
        if (payfastPayment?.statusCode != "0000") {
          await prisma.failedAttempt.create({ data: { phoneNumber: paymentRequestObj.accountNo } });
          console.log(JSON.stringify({ event: "PAYFAST_PAYIN_RESPONSE", order_id: paymentRequest.merchant_transaction_id, response: payfastPayment }))
          throw new CustomError(payfastPayment.message, 500)
        }
      }
    }
    else if (paymentRequestObj?.provider?.toLowerCase() == "upaisa") {
      const token = await payfast.getApiToken(merchant.uid, {});
      if (!token?.token) {
        throw new CustomError("No Token Recieved", 500);
      }
      const validation = await payfast.validateCustomerInformationForCnic(merchant.uid, {
        token: token?.token,
        bankCode: '14',
        order_id: paymentRequest.merchant_transaction_id,
        phone: transactionService.convertPhoneNumber(paymentRequestObj.accountNo) || transactionService.convertPhoneNumber((paymentRequest?.metadata as JsonObject)?.phone as string),
        amount: paymentRequest.amount,
        email: paymentRequest.email || "a@example.com",
        cnic: paymentRequestObj?.cnic,
        type: "wallet"
      })
      if (!validation?.transaction_id) {
        throw new CustomError("Transaction Not Created", 500);
      }
      response = validation;
    }
    else if (paymentRequestObj?.provider?.toLocaleLowerCase() == "zindigi") {
      const token = await payfast.getApiToken(merchant.uid, {});
      if (!token?.token) {
        throw new CustomError("No Token Recieved", 500);
      }
      const validation = await payfast.validateCustomerInformationForCnic(merchant.uid, {
        token: token?.token,
        bankCode: '29',
        order_id: paymentRequest.merchant_transaction_id,
        phone: transactionService.convertPhoneNumber(paymentRequestObj.accountNo) || transactionService.convertPhoneNumber((paymentRequest?.metadata as JsonObject)?.phone as string),
        amount: paymentRequest.amount,
        email: paymentRequest.email
      })
      if (!validation?.transaction_id) {
        throw new CustomError("Transaction Not Created", 500);
      }
      response = validation;
    }
    else if (
      paymentRequestObj.provider?.toLocaleLowerCase() === "card"
    ) {
      let commission;
      if (+(merchant?.commissions[0].cardRate as Decimal) != 0) {
        commission = +merchant?.commissions[0].commissionGST +
          +(merchant?.commissions[0].cardRate as Decimal) +
          +merchant.commissions[0].commissionWithHoldingTax
      }
      else {
        commission = +merchant?.commissions[0].commissionGST +
          +merchant.commissions[0].commissionRate +
          +merchant.commissions[0].commissionWithHoldingTax
      }
      let id2 = paymentRequest.merchant_transaction_id || paymentRequestObj.transaction_id;
      await prisma.transaction.update({
        where: {
          merchant_transaction_id: id2
        },
        data: {
          type: "card"
        }
      })
    }

    let updatedPaymentRequest;
    if (paymentRequestObj?.provider.toLowerCase() == "jazzcash" || paymentRequestObj?.provider.toLowerCase() == "easypaisa") {
      console.log("Wallet")
      updatedPaymentRequest = await prisma.$transaction(async (tx) => {
        return tx.paymentRequest.update({
          where: {
            id: paymentRequestObj.payId,
          },
          data: {
            status: "paid",
            updatedAt: new Date(),
          },
        });
      });

      try {
        if (merchant?.wooMerchantId) {
          await updateWooOrderStatus(
            merchant.wooMerchantId as number,
            paymentRequest.merchant_transaction_id as string || paymentRequest.transactionId as string,
            "000"
          );
        }
      } catch (e) {

      }
    }

    return {
      message: "Payment request paid successfully",
      ...response
      // data: updatedPaymentRequest,
    };
  } catch (error: any) {
     await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.update({
        where: {
          id: paymentRequestObj.payId,
        },
        data: {
          status: "failed",
          updatedAt: new Date(),
        },
      });
    });
    try {
      const pr = await prisma.paymentRequest.findFirst({ where: { id: paymentRequestObj.payId } });
      if (pr?.userId) {
        const m = await prisma.merchant.findFirst({ where: { merchant_id: pr.userId } });
        if (m?.wooMerchantId) {
          await updateWooOrderStatus(
            m.wooMerchantId as number,
            pr.merchant_transaction_id || (pr.transactionId as string),
            "999"
          );
        }
      }
    } catch (e) {
      // noop
    }
    throw new CustomError(
      error?.message || "An error occurred while updating the payment request",
      error?.statusCode || 500
    );
  }
};

const payRequestedPaymentForRedirection = async (paymentRequestObj: any) => {
  try {
    const paymentRequest = await prisma.paymentRequest.findFirst({
      where: {
        id: paymentRequestObj.payId,
        deletedAt: null,
      },
    });

    if (!paymentRequest) {
      throw new CustomError("Payment request not found", 404);
    }

    // Check if payment request is failed
    if (paymentRequest.status === "failed") {
      throw new CustomError("Payment link has been expired", 400);
    }

    if (!paymentRequest.userId) {
      throw new CustomError("User not found", 404);
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
      throw new CustomError("Merchant not found", 404);
    }
    console.log(merchant?.easypaisaPaymentMethod)
    let response;


    if (
      paymentRequestObj.provider?.toLocaleLowerCase() === "easypaisa"
    ) {
      if (merchant.easypaisaPaymentMethod === "DIRECT") {
        // easypaisa payment
        response = await easyPaisaService.initiateEasyPaisaForRedirection(
          merchant.uid,
          {
            order_id: paymentRequest.merchant_transaction_id,
            amount: paymentRequest.amount,
            type: "wallet",
            phone: paymentRequestObj.accountNo || (paymentRequest?.metadata as JsonObject)?.phone,
            email: "example@example.com",
            // orderId: `SPAY-PR-${paymentRequest.id}`,
            attempts: paymentRequestObj.attempts,
            challengeId: paymentRequestObj.challengeId
          }
        );

        if (paymentRequestObj?.challengeId) {
          await prisma.transactionLocation.updateMany({
            where: { challengeId: paymentRequestObj?.challengeId },
            data: { transactionId: response.transaction_id }
          });
        }

        if (response.statusCode != "0000") {
          throw new CustomError(
            response.message,
            500
          );
        }

      }
      else {
        const token = await payfast.getApiToken(merchant.uid, {});
        if (!token?.token) {
          console.log(JSON.stringify({ event: "PAYFAST_PAYIN_NO_TOKEN_RECIEVED", order_id: paymentRequest.merchant_transaction_id }))
          throw new CustomError("No Token Recieved", 500);
        }
        const validation = await payfast.validateCustomerInformation(merchant.uid, {
          token: token?.token,
          bankCode: '32',
          order_id: paymentRequest.merchant_transaction_id,
          phone: transactionService.convertPhoneNumber(paymentRequestObj.accountNo) || transactionService.convertPhoneNumber((paymentRequest?.metadata as JsonObject)?.phone as string),
          amount: paymentRequest.amount,
          email: paymentRequest.email
        })
        if (paymentRequestObj?.challengeId) {
          await prisma.transactionLocation.updateMany({
            where: { challengeId: paymentRequestObj?.challengeId },
            data: { transactionId: validation.txnNo2 }
          });
        }
        if (!validation?.transaction_id) {
          await prisma.failedAttempt.create({ data: { phoneNumber: paymentRequestObj.accountNo } });
          console.log(JSON.stringify({ event: "PAYFAST_PAYIN_VALIDATION_FAILED", order_id: paymentRequest.merchant_transaction_id }))
          throw new CustomError(validation.response_message, 500)
          // return;
        }
        const payfastPayment = await payfast.payForRedirection(merchant.uid, {
          token: token?.token,
          bankCode: '32',
          transaction_id: validation?.transaction_id,
          order_id: paymentRequest.merchant_transaction_id,
          phone: transactionService.convertPhoneNumber(paymentRequestObj.accountNo) || transactionService.convertPhoneNumber((paymentRequest?.metadata as JsonObject)?.phone as string),
          amount: paymentRequest.amount,
          email: paymentRequest.email,
          attempts: paymentRequestObj.attempts,
          challengeId: paymentRequestObj.challengeId
        });
        if (payfastPayment?.statusCode != "0000") {
          await prisma.failedAttempt.create({ data: { phoneNumber: paymentRequestObj.accountNo } });
          console.log(JSON.stringify({ event: "PAYFAST_PAYIN_RESPONSE", order_id: paymentRequest.merchant_transaction_id, response: payfastPayment }))
          throw new CustomError(payfastPayment.message, 500)
        }
      }
    }

    let updatedPaymentRequest;
    if (paymentRequestObj?.provider.toLowerCase() == "jazzcash" || paymentRequestObj?.provider.toLowerCase() == "easypaisa") {
      console.log("Wallet")
      updatedPaymentRequest = await prisma.$transaction(async (tx) => {
        return tx.paymentRequest.update({
          where: {
            id: paymentRequestObj.payId,
          },
          data: {
            status: "paid",
            updatedAt: new Date(),
          },
        });
      });
      try {
        if (merchant?.wooMerchantId) {
          await updateWooOrderStatus(
            merchant.wooMerchantId as number,
            paymentRequest.merchant_transaction_id as string || paymentRequest.transactionId as string,
            "000"
          );
        }
      } catch (e) {

      }
    }

    return {
      message: "Payment request paid successfully",
      ...response
      // data: updatedPaymentRequest,
    };
  } catch (error: any) {
    await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.update({
        where: {
          id: paymentRequestObj.payId,
        },
        data: {
          status: "failed",
          updatedAt: new Date(),
        },
      });
    });
    try {
      const pr = await prisma.paymentRequest.findFirst({ where: { id: paymentRequestObj.payId } });
      if (pr?.userId) {
        const m = await prisma.merchant.findFirst({ where: { merchant_id: pr.userId } });
        if (m?.wooMerchantId) {
          await updateWooOrderStatus(
            m.wooMerchantId as number,
            pr.merchant_transaction_id as string || (pr.transactionId as string),
            "999"
          );
        }
      }
    } catch (e) {
      // noop
    }
    throw new CustomError(
      error?.message || "An error occurred while updating the payment request",
      error?.statusCode || 500
    );
  }
};

const payUpaisaZindigi = async (paymentRequestObj: any) => {
  try {
    const paymentRequest = await prisma.paymentRequest.findFirst({
      where: {
        id: paymentRequestObj.payId,
        deletedAt: null,
      },
    });

    if (!paymentRequest) {
      throw new CustomError("Payment request not found", 404);
    }

    // Check if payment request is failed
    if (paymentRequest.status === "failed") {
      throw new CustomError("Payment link has been expired", 400);
    }

    if (!paymentRequest.userId) {
      throw new CustomError("User not found", 404);
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
      throw new CustomError("Merchant not found", 404);
    }
    console.log(merchant?.easypaisaPaymentMethod)


    if (paymentRequestObj?.provider?.toLowerCase() == "upaisa") {
      const token = await payfast.getApiToken(merchant.uid, {});
      if (!token?.token) {
        throw new CustomError("No Token Recieved", 500);
      }
      const validation = await payfast.payCnic(merchant.uid, {
        transactionId: paymentRequestObj?.transactionId,
        transaction_id: paymentRequestObj?.transaction_id,
        otp: paymentRequestObj?.otp,
        bankCode: '14'
      })
      if (validation?.statusCode != "00") {
        throw new CustomError("Payment Failed", 500);
      }
    }
    else if (paymentRequestObj?.provider?.toLocaleLowerCase() == "zindigi") {
      const token = await payfast.getApiToken(merchant.uid, {});
      if (!token?.token) {
        throw new CustomError("No Token Recieved", 500);
      }
      const validation = await payfast.payCnic(merchant.uid, {
        transactionId: paymentRequestObj?.transactionId,
        transaction_id: paymentRequestObj?.transaction_id,
        otp: paymentRequestObj?.otp,
        bankCode: '29'
      })
      if (validation?.statusCode != "00") {
        throw new CustomError("Payment Failed", 500);
      }
    }

    let updatedPaymentRequest;

    updatedPaymentRequest = await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.update({
        where: {
          id: paymentRequestObj.payId,
        },
        data: {
          status: "paid",
          updatedAt: new Date(),
        },
      });
    });

    return {
      message: "Payment request paid successfully",
      // data: updatedPaymentRequest,
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while updating the payment request",
      error?.statusCode || 500
    );
  }
};



const getPaymentRequestbyId = async (paymentRequestId: string) => {
  try {
    const paymentRequest = await prisma.paymentRequest.findFirst({
      where: {
        id: paymentRequestId,
        deletedAt: null,
      },
    });

    console.log("Payment Request", paymentRequest)

    if (!paymentRequest) {
      throw new CustomError("Payment request not found", 404);
    }

    // Check if payment request is failed
    if (paymentRequest.status === "failed") {
      throw new CustomError("Payment link has been expired", 400);
    }
    const credentials = await prisma.merchant.findUnique({
      where: {
        merchant_id: paymentRequest.userId as number
      },
      include: {
        JazzCashCardMerchant: true
      }
    })
    let creds;
    if (credentials?.JazzCashCardMerchant) {
      creds = encryptUtf(JSON.stringify({
        jazzMerchantId: credentials?.JazzCashCardMerchant?.jazzMerchantId,
        password: credentials?.JazzCashCardMerchant?.password,
        integritySalt: credentials?.JazzCashCardMerchant?.integritySalt,
        returnUrl: credentials?.JazzCashCardMerchant?.returnUrl
      }))
    }
    else {
      creds = {}
    }
    return {
      message: "Payment request retrieved successfully",
      data: {
        ...paymentRequest,
        credentials: creds,
        return_url: (paymentRequest.metadata as JsonObject)?.return_url
      },
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message ||
      "An error occurred while retrieving the payment request",
      error?.statusCode || 500
    );
  }
};

const getPaymentRequest = async (obj: any) => {
  try {
    if (!obj.user.merchant_id) {
      throw new CustomError("User not found", 400);
    }

    const where: any = {
      deletedAt: null,
      userId: obj.user.merchant_id,
    };

    if (obj?.id) {
      where["id"] = obj.id;

      let paymentRequest = await prisma.paymentRequest.findFirst({
        where: where,
      });

      if (!paymentRequest) {
        throw new CustomError("Payment request not found", 404);
      }

      return {
        message: "Payment request retrieved successfully",
        data: paymentRequest,
      };
    } else {
      let paymentRequests = await prisma.paymentRequest.findMany({
        where: where,
      });

      if (!paymentRequests) {
        throw new CustomError("Payment requests not found", 404);
      }

      return {
        message: "Payment requests retrieved successfully",
        data: paymentRequests,
      };
    }
  } catch (error: any) {
    throw new CustomError(
      error?.message ||
      "An error occurred while retrieving the payment request",
      error?.statusCode || 500
    );
  }
};

const updatePaymentRequest = async (
  paymentRequestId: string,
  data: any,
  user: any
) => {
  try {
    // Verify the transaction ID, does it exist in the database?
    const transaction = await prisma.transaction.findFirst({
      where: {
        transaction_id: data.transactionId,
      },
    });

    if (!transaction) {
      throw new CustomError("Transaction not found", 404);
    }

    // Verify if it is being updated by the same user
    const paymentRequest = await prisma.paymentRequest.findFirst({
      where: {
        id: paymentRequestId,
        deletedAt: null,
      },
    });

    // Verify User id
    // console.log("Req User Id", user.id);
    // console.log("paymentRequest User Id", paymentRequest?.userId);

    if (paymentRequest?.userId !== user.id) {
      throw new CustomError("Payment request not found", 404);
    }

    const updatedPaymentRequest = await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.update({
        where: {
          id: paymentRequestId,
        },
        data: {
          amount: data.amount,
          status: data.status,
          email: data.email,
          description: data.description,
          transactionId: data.transactionId,
          provider: data.provider,
          dueDate: data.dueDate,
          link: data.link,
          metadata: data.metadata || {},
          updatedAt: new Date(),
        },
      });
    });

    if (!updatedPaymentRequest) {
      throw new CustomError(
        "An error occurred while updating the payment request",
        500
      );
    }

    return {
      message: "Payment request updated successfully",
      data: updatedPaymentRequest,
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while updating the payment request",
      error?.statusCode || 500
    );
  }
};

const deletePaymentRequest = async (paymentRequestId: string) => {
  try {
    // Verify if it is already deleted
    const paymentRequest = await prisma.paymentRequest.findFirst({
      where: {
        id: paymentRequestId,
        deletedAt: null,
      },
    });

    if (!paymentRequest) {
      throw new CustomError("Payment request not found", 404);
    }

    const deletedPaymentRequest = await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.update({
        where: {
          id: paymentRequestId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    });

    if (!deletedPaymentRequest) {
      throw new CustomError(
        "An error occurred while deleting the payment request",
        500
      );
    }

    return {
      message: "Payment request deleted successfully",
      data: deletedPaymentRequest,
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while deleting the payment request",
      error?.statusCode || 500
    );
  }
};



export default {
  createPaymentRequest,
  getPaymentRequest,
  updatePaymentRequest,
  deletePaymentRequest,
  payRequestedPayment,
  getPaymentRequestbyId,
  createPaymentRequestClone,
  createPaymentRequestWithOtp,
  payUpaisaZindigi,
  payRequestedPaymentForRedirection,
  createPaymentRequestWithOtpClone
};