// src/services/userService.ts
import bcrypt from "bcrypt";
import { User, UserGroup } from '@prisma/client';
import prisma from "prisma/client.js";
import merchant from "services/merchant/index.js";

// Create User
export const createUser = async (fullName: string, email: string, password: string, groups: number[], merchantId?: number): Promise<User> => {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            username: fullName,
            email,
            password: hashedPassword,
        },
    });

    // Then create group associations if groups array exists
    if (groups && groups.length > 0) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                groups: {
                    create: groups.map((groupId: number) => ({
                        // userId: user.id,
                        groupId,
                        merchantId,
                    })),
                },
            },
        });
    }

    return user;
};

// Get User by ID
export const getUserById = async (userId: number, merchantId: number): Promise<User | null> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            groups: {
                include: {
                    group: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    if (user?.groups[0].merchantId !== merchantId) {
        return null;
    }

    return user;
};

// Update User
export const updateUser = async (userId: number, fullName: string, email: string, merchantId: number, groups?: number[], password?: string): Promise<User | null> => {
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    console.log(merchantId)
    // const user = await prisma.user.findUnique({
    //     where: { id: userId },
    //     include: {
    //         groups: {
    //             include: {
    //                 group: {
    //                     include: {
    //                         permissions: {
    //                             include: {
    //                                 permission: true,
    //                             },
    //                         },
    //                     },
    //                 },
    //             },
    //         },
    //     },
    // });
    // if (user?.groups[0].merchantId !== merchantId) {
    //     return null;
    // }
    const updatedUser = await prisma.user.update({
        where: { 
            id: userId,
            groups: {
                every: {
                    merchantId,
                },
            }
        },
        data: {
            username: fullName,
            email,
            password: hashedPassword,
            groups: {
                deleteMany: { userId },
                create: groups?.map((groupId) => ({
                    userId: userId,
                    groupId,
                    merchantId,
                })),
            },
        },
    });
    if (!updatedUser) {
        return null;
    }
    return updatedUser;
};

// Delete User
export const deleteUser = async (userId: number, merchantId: number): Promise<User | null> => {
    const deletedUser = await prisma.user.delete({
        where: { id: userId,groups: {every: {merchantId}} },
    });
    if (!deletedUser) {
        return null;
    }
    return deletedUser;
};

export default {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
}
