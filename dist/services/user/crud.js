// src/services/userService.ts
import bcrypt from "bcrypt";
import prisma from "prisma/client.js";
// Create User
export const createUser = async (fullName, email, password, groups, merchantId) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    return await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                username: fullName,
                email,
                password: hashedPassword,
            },
        });
        // Then create group associations if groups array exists
        if (groups && groups.length > 0) {
            await tx.user.update({
                where: { id: user.id },
                data: {
                    groups: {
                        create: groups.map((groupId) => ({
                            // userId: user.id,
                            groupId,
                            merchantId,
                        })),
                    },
                },
            });
        }
        return user;
    });
};
// Get User by ID
export const getUsers = async (merchantId) => {
    let usersOfMerchant = await prisma.userGroup.findMany({
        where: {
            merchantId,
        },
        include: {
            user: true,
            group: true,
        },
    });
    if (!usersOfMerchant) {
        return null;
    }
    let users = usersOfMerchant.map((user) => user.user);
    return users;
};
// Update User
export const updateUser = async (userId, fullName, email, merchantId, groups, password) => {
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    console.log(merchantId);
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
        },
    });
    if (!updatedUser) {
        return null;
    }
    return updatedUser;
};
// Delete User
export const deleteUser = async (userId, merchantId) => {
    const deletedUser = await prisma.user.delete({
        where: { id: userId, groups: { every: { merchantId } } },
    });
    if (!deletedUser) {
        return null;
    }
    return deletedUser;
};
export default {
    createUser,
    getUsers,
    updateUser,
    deleteUser,
};
