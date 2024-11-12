import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

const createPaymentRequest = async (data: any, user: any) => {
  try {
    // if (user.role !== "Merchant") {
    //   throw new CustomError("Only merchants can create payment requests", 403);
    // }

    if (!user.id) {
      throw new CustomError("User not found", 400);
    }

    const newPaymentRequest = await prisma.$transaction(async (tx) => {
      return tx.paymentRequest.create({
        data: {
          userId: user.id,
          amount: data.amount,
          status: "pending",
          email: data.email,
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

    if (!newPaymentRequest) {
      throw new CustomError(
        "An error occurred while creating the payment request",
        500
      );
    }

    return {
      message: "Payment request created successfully",
      data: newPaymentRequest,
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while creating the payment request",
      error?.statusCode || 500
    );
  }
};

const payRequestedPayment = async (paymentRequestId: string) => {
  try {
    const paymentRequest = await prisma.paymentRequest.findFirst({
      where: {
        id: paymentRequestId,
        deletedAt: null,
      },
    });
    // console.log("🚀 ~ payRequestedPayment ~ paymentRequest:", paymentRequest)
    
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
    // console.log("🚀 ~ payRequestedPayment ~ merchant:", merchant)


    // const updatedPaymentRequest = await updatePaymentRequest(paymentRequestId, {
    //   status: "paid",
    //   link: `/${paymentRequest.id}`,
    // });

    return {
      message: "Payment request updated successfully",
      // data: updatedPaymentRequest,
    };
  } catch (error: any) {
    throw new CustomError(
      error?.message || "An error occurred while updating the payment request",
      error?.statusCode || 500
    );
  }
};

const getPaymentRequest = async (obj: any) => {
  try {
    const where: any = {
      deletedAt: null,
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

const updatePaymentRequest = async (paymentRequestId: string, data: any) => {
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
};
