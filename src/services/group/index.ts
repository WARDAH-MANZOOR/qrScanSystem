import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

const createGroup = async (name: string, merchant_id: number, permissionIds: number[]) => {
    try {
        const data = await prisma.$transaction(async (tx) => {
            const group = await prisma.group.create({
                data: { name, merchant_id },
            });
            const objs = permissionIds.map(obj => ({ groupId: group.id, permissionId: obj }))
            const groupPermission = await prisma.groupPermission.createMany({
                data: objs,
            });
            return {
                group, groupPermission
            }
        })
        //   res.json({ success: true, group });
        return { success: true, data }
    } catch (error: any) {
        throw new CustomError(error.message, 500);
    }
};

const readGroups = async (merchantId: number, groupId: number) => {
    try {
        //   const { merchant_id, groupId } = req.query;

        const groups = await prisma.group.findMany({
            where: {
                ...(merchantId && { merchantId: merchantId }),
                ...(groupId && { id: groupId }),
            },
            include: {
                users: true,
                permissions: {
                    include: { permission: true },
                },
            },
        });

        //   res.json({ success: true, groups });
        return { success: true, groups }
    } catch (error: any) {
        throw new CustomError(error?.message, 500)
        //   res.status(500).json({ success: false, message: error.message });
    }
};

const deleteGroup = async (groupId: number) => {
    try {
        // const { groupId } = req.body;

        // Remove associated user groups and permissions
        await prisma.userGroup.deleteMany({ where: { groupId } });
        await prisma.groupPermission.deleteMany({ where: { groupId } });

        // Delete the group
        await prisma.group.delete({ where: { id: groupId } });

        return {
            success: true,
            message: "Group successfully deleted"
        }
        // res.json({ success: true, message: "Group successfully deleted" });
    } catch (error: any) {
        throw new CustomError(error?.message, 500);
    }
};

const updateGroupPermissions = async (groupId: number, permissionIds: { add: number[]; remove: number[] }) => {
    try {
        //   const { groupId, permissionIds } = req.body;
        const { add = [], remove = [] } = permissionIds;

        // Add new permissions
        if (add.length > 0) {
            await prisma.groupPermission.createMany({
                data: add.map((permissionId) => ({
                    groupId,
                    permissionId,
                })),
                skipDuplicates: true,
            });
        }

        // Remove permissions
        if (remove.length > 0) {
            await prisma.groupPermission.deleteMany({
                where: {
                    groupId,
                    permissionId: { in: remove },
                },
            });
        }
        return {
            success: true,
            message: `Permissions updated successfully`,
        }

        //   res.json({
        //     success: true,
        //     message: `Permissions updated successfully`,
        //   });
    } catch (error: any) {
        // res.status(500).json({ success: false, message: error.message });
        throw new CustomError(error?.message, 500)
    }
};

export default {
    createGroup,
    deleteGroup,
    readGroups,
    updateGroupPermissions,
}