// src/validators/userValidators.ts
import { body, param, validationResult } from 'express-validator';
import { JwtPayload } from 'jsonwebtoken';
import prisma from 'prisma/client.js';

// Validator for creating a user
const createUserValidator = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('groups')
    .isArray({ min: 1 })
    .withMessage('At least one group ID must be provided')
    .bail()
    .custom((value) => value.every((id: number) => Number.isInteger(id)))
    .withMessage('Group IDs must be an array of integers'),
  body('merchantId')
    .optional()
    .isInt()
    .withMessage('Merchant ID must be an integer'),
];

// Validator for updating a user
const updateUserValidator = [
  param('userId').isInt().withMessage('User ID must be an integer'),
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body("groups")
    .optional()
    .isObject()
    .withMessage("Groups must be an object with 'add' and 'remove' keys")
    .custom((value) => {
      if (!value.add && !value.remove) {
        throw new Error("At least one of 'add' or 'remove' keys must be provided");
      }
      return true;
    }),
  body("groups.add")
    .optional()
    .isArray()
    .withMessage("'add' must be an array of permission IDs")
    .custom(async (value) => {
      if (value.length > 0) {
        const groups = await prisma.group.findMany({
          where: { id: { in: value } },
        });

        if (groups.length !== value.length) {
          throw new Error("One or more Permission IDs in 'add' do not exist");
        }
      }
    }),
  body("groups.remove")
    .optional()
    .isArray()
    .withMessage("'remove' must be an array of permission IDs")
    .custom(async (value, { req }) => {
      if (value.length > 0) {
        // Check if permissions exist
        const permissions = await prisma.group.findMany({
          where: { id: { in: value } },
        });

        if (permissions.length !== value.length) {
          throw new Error("One or more Permission IDs in 'remove' do not exist");
        }
        console.log(req.user)
        // Check if the permissions are actually assigned to the group
        const existingGroupPermissions = await prisma.userGroup.findMany({
          where: {
            groupId: { in: value },
            userId: Number(req.params?.userId),
          },
        });
        console.log(existingGroupPermissions)

        const existingPermissionIds = existingGroupPermissions.map((gp) => gp.groupId);
        console.log(existingPermissionIds);
        const missingPermissions = value.filter((id: number) => !existingPermissionIds.includes(id));

        if (missingPermissions.length > 0) {
          throw new Error(
            `Permissions ${missingPermissions.join(", ")} are not assigned to this group`
          );
        }
      }
    }),
  body('merchantId')
    .optional()
    .isInt()
    .withMessage('Merchant ID must be an integer'),
];

// Validator for deleting a user
const deleteUserValidator = [
  param('userId')
    .isInt().
    withMessage('User ID must be an integer')
    .custom(async (value, { req }) => {
      const group = await prisma.user.findUnique({ where: { id: +value } });
      if (!group) {
        throw new Error("User ID does not exist");
      }
    }),
];

// Custom middleware to handle validation errors
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export default {
  createUserValidator,
  updateUserValidator,
  deleteUserValidator,
  handleValidationErrors,
}