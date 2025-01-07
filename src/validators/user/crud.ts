// src/validators/userValidators.ts
import { body, param, validationResult } from 'express-validator';

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

// Validator for fetching a user by ID
const getUserValidator = [
  param('userId').isInt().withMessage('User ID must be an integer'),
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
  body('groups')
    .optional()
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

// Validator for deleting a user
const deleteUserValidator = [
  param('userId').isInt().withMessage('User ID must be an integer'),
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
    getUserValidator,
    updateUserValidator,
    deleteUserValidator,
    handleValidationErrors,
}