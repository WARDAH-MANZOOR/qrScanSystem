import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const permissions = [
  // User Management Permissions
  { id: 1, name: "Portal users list" },
  { id: 2, name: "Create portal user" },
  { id: 3, name: "Update portal user" },
  { id: 4, name: "Create user group" },
  { id: 5, name: "Update user group" },
  { id: 6, name: "View all user groups" },
  { id: 7, name: "View Group List" },

  // Back Office Permissions
  { id: 8, name: "Transactions List" },
  { id: 9, name: "Profile" },
  { id: 10, name: "Reports" },
  { id: 11, name: "Capture/Void Transactions" },
  { id: 12, name: "Refund Purchase Transactions" },
  { id: 13, name: "View/Manage Hold Transactions" },
  { id: 14, name: "Invoice Transactions" },
  { id: 15, name: "View Available Balance" },
  { id: 16, name: "Disbursement" },
  {id: 17, name: "Pay"},
];

async function seed() {
  try {
    console.log('Start seeding permissions...');
    for (const p of permissions) {
      await prisma.permission.create({
        data: p,
      });
    }
    // Seed groups and associate users with groups
    const admin = await prisma.group.create({
      data:
      {
        name: 'Admin',
      }
    });
    console.log(admin.id)
    const merchant = await prisma.group.create({
      data:
      {
        name: 'Merchant',
      }
    });
    const customer = await prisma.group.create({
      data: {
        name: "Customer"
      }
    })

    const groupPermissions = [
      { groupId: admin.id, permissionId: 1 },
      { groupId: admin.id, permissionId: 2 },
      { groupId: admin.id, permissionId: 3 },
      { groupId: admin.id, permissionId: 4 },
      { groupId: admin.id, permissionId: 5 },
      { groupId: admin.id, permissionId: 6 },
      { groupId: admin.id, permissionId: 7 },
      { groupId: admin.id, permissionId: 8 },
      { groupId: admin.id, permissionId: 9 },
      { groupId: admin.id, permissionId: 10 },
      { groupId: admin.id, permissionId: 11 },
      { groupId: admin.id, permissionId: 12 },
      { groupId: admin.id, permissionId: 13 },
      { groupId: admin.id, permissionId: 14 },
      { groupId: merchant.id, permissionId: 1 },
      { groupId: merchant.id, permissionId: 2 },
      { groupId: merchant.id, permissionId: 3 },
      { groupId: merchant.id, permissionId: 4 },
      { groupId: merchant.id, permissionId: 5 },
      { groupId: merchant.id, permissionId: 6 },
      { groupId: merchant.id, permissionId: 7 },
      { groupId: merchant.id, permissionId: 8 },
      { groupId: merchant.id, permissionId: 9 },
      { groupId: merchant.id, permissionId: 10 },
      { groupId: merchant.id, permissionId: 11 },
      { groupId: merchant.id, permissionId: 12 },
      { groupId: merchant.id, permissionId: 13 },
      { groupId: merchant.id, permissionId: 14 },
      {groupId: customer.id, permissionId: 17}
    ];

    // Seed the group-permission relationships
    console.log("Group Permissions");
    await prisma.groupPermission.createMany({
      data: groupPermissions,
      skipDuplicates: true, // Skip if the relation already exists
    });
    let user = await prisma.user.create({
      data: {
        username: "Devtects",
        email: "devtects@gmail.com",
        password: "$2b$10$x.aFQ5yogpciQROeYls/ouVXDt4Czv5xWWrfelgoIL4AjZgl9Guv6",
      }
    })
    await prisma.userGroup.create({
      data: {
        userId: user.id,
        groupId: admin.id,
        // merchantId: user.id
      }
    })
    console.log('Seed completed!');
  } catch (error) {
    console.error('Error while seeding:', error);
  }
}

seed()
