import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
import {
  jazzCashService,
  easyPaisaService,
  swichService,
  transactionService,
} from "../../services/index.js";

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
          email: "example@example.com",
          description: data.description,
          transactionId: data.transactionId,
          dueDate: data.dueDate,
          provider: data.provider,
          link: data.link,
          metadata: data.metadata || {},
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
      data: {...updatedPaymentRequest, completeLink: `https://sahulatpay.com/pay/${newPaymentRequest.id}`},
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
      throw new CustomError("User Id not given",404);
    }

    let user2 = await prisma.merchant.findFirst({
      where: {
        uid: user
      }
    })
    const newPaymentRequest = await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.create({
        data: {
          userId: user2?.merchant_id,
          amount: data.amount,
          status: "pending",
          email: "example@example.com",
          description: data.description,
          transactionId: data.transactionId,
          dueDate: data.dueDate,
          provider: data.provider,
          link: data.link,
          metadata: data.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date(),
          merchant_transaction_id: data.order_id,
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
      data: {...updatedPaymentRequest, completeLink: `https://sahulatpay.com/pay/${newPaymentRequest.id}`, storeName: data.storeName, order_id: data.order_id},
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

    if (!paymentRequest.userId) {
      throw new CustomError("User not found", 404);
    }

    // find merchant by user id because merchant and user are the same
    const merchant = await prisma.merchant.findFirst({
      where: {
        merchant_id: paymentRequest.userId,
      },
    });

    if (!merchant || !merchant.uid) {
      throw new CustomError("Merchant not found", 404);
    }

    if (paymentRequestObj.provider?.toLocaleLowerCase() === "jazzcash") {
      const jazzCashPayment = await jazzCashService.initiateJazzCashPayment(
        {
          order_id: paymentRequest.merchant_transaction_id,
          amount: paymentRequest.amount,
          type: "wallet",
          phone: paymentRequestObj.accountNo,
          redirect_url: paymentRequest.link,
        },
        merchant.uid
      );
      if (jazzCashPayment.statusCode != "000") {
        throw new CustomError(
          "An error occurred while paying the payment request",
          500
        );
      }
    } else if (
      paymentRequestObj.provider?.toLocaleLowerCase() === "easypaisa"
    ) {
      if (merchant.easypaisaPaymentMethod === "DIRECT") {
        // easypaisa payment
        const easyPaisaPayment = await easyPaisaService.initiateEasyPaisa(
          merchant.uid,
          {
            order_id: paymentRequest.merchant_transaction_id,
            amount: paymentRequest.amount,
            type: "wallet",
            phone: paymentRequestObj.accountNo,
            email: paymentRequest.email,
            // orderId: `SPAY-PR-${paymentRequest.id}`,
          }
        );

        if (easyPaisaPayment.statusCode != "0000") {
          throw new CustomError(
            "An error occurred while paying the payment request",
            500
          );
        }
      } else {
        // swich payment
        const swichPayment = await swichService.initiateSwich(
          {
            order_id: paymentRequest.merchant_transaction_id,
            channel: 1749,
            amount: paymentRequest.amount,
            phone: transactionService.convertPhoneNumber(paymentRequestObj.accountNo),
            email: paymentRequest.email,
            // order_id: `SPAY-PR-${paymentRequest.id}`,
            type: "wallet",
          },
          merchant.uid
        );

        if (swichPayment?.statusCode != "0000") {
          throw new CustomError(
            "An error occurred while paying the payment request",
            500
          );
        }
      }
    }

    const updatedPaymentRequest = await prisma.$transaction(async (tx) => {
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

    if (!paymentRequest) {
      throw new CustomError("Payment request not found", 404);
    }

    return {
      message: "Payment request retrieved successfully",
      data: paymentRequest,
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
  createPaymentRequestClone
};
