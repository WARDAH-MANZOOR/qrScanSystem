import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";

const addDisburseAccount = async (payload: any) => {
    try {
        const newAccount = await prisma.$transaction(async (tx) => {
            return tx.jazzCashDisburseAccount.create({
                data: {
                    initialVector: payload.initialVector,
                    key: payload.key,
                    tokenKey: payload.tokenKey
                },
            });
        });

        if (!newAccount) {
            throw new CustomError(
                "An error occurred while creating the disburse account",
                500
            );
        }

        return {
            message: "Disburse account created successfully",
            data: newAccount,
        };
    } catch (error: any) {
        throw new CustomError(
            error?.message || "An error occurred while creating the disburse account",
            500
        );
    }
};

const getDisburseAccount = async (accountId: number | null | string) => {
    try {
        const where: any = {
            deletedAt: null,
        };

        if (accountId) {
            where["id"] = accountId;

            let account = await prisma.jazzCashDisburseAccount.findFirst({
                where: where,
            });

            if (!account) {
                throw new CustomError("Disburse account not found", 404);
            }

            return {
                message: "Disburse account retrieved successfully",
                data: account,
            };
        } else {
            let account = await prisma.jazzCashDisburseAccount.findMany({
                where: where,
                orderBy: {
                    id: "desc",
                },
            });

            if (!account) {
                throw new CustomError("Disburse account not found", 404);
            }

            return {
                message: "Disburse account retrieved successfully",
                data: account,
            };
        }
    } catch (error: any) {
        throw new CustomError(
            error?.message ||
            "An error occurred while retrieving the disburse account",
            500
        );
    }
};

const updateDisburseAccount = async (accountId: string, payload: any) => {
    try {
        const updatedAccount = await prisma.$transaction(async (tx) => {
            return tx.jazzCashDisburseAccount.update({
                where: {
                    id: parseInt(accountId),
                },
                data: {
                    initialVector: payload.initialVector,
                    key: payload.key,
                    tokenKey: payload.tokenKey
                },
            });
        });

        if (!updatedAccount) {
            throw new CustomError(
                "An error occurred while updating the disburse account",
                500
            );
        }

        return {
            message: "Disburse account updated successfully",
            data: updatedAccount,
        };
    } catch (error: any) {
        throw new CustomError(
            error?.message || "An error occurred while updating the disburse account",
            500
        );
    }
};

const deleteDisburseAccount = async (accountId: string) => {
    try {
        const deletedAccount = await prisma.$transaction(async (tx) => {
            return tx.jazzCashDisburseAccount.update({
                where: {
                    id: parseInt(accountId),
                },
                data: {
                    deletedAt: new Date(),
                },
            });
        });

        if (!deletedAccount) {
            throw new CustomError(
                "An error occurred while deleting the disburse account",
                500
            );
        }

        return {
            message: "Disburse account deleted successfully",
            data: deletedAccount,
        };
    } catch (error: any) {
        throw new CustomError(
            error?.message || "An error occurred while deleting the disburse account",
            500
        );
    }
};

export default {
    addDisburseAccount,
    getDisburseAccount,
    updateDisburseAccount,
    deleteDisburseAccount,
};
