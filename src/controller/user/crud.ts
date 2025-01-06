// src/controllers/userController.ts
import { Request, Response } from 'express';
import * as userService from '../../services/user/crud.js';
import ApiResponse from 'utils/ApiResponse.js';
import { JwtPayload } from 'jsonwebtoken';

// Create User
const createUser = async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, password, groups } = req.body;
  const merchantId = (req.user as JwtPayload)?.merchant_id; 
  try {
    const user = await userService.createUser(fullName, email, password, groups, merchantId);
    res.status(201).json(ApiResponse.success(user));
  } catch (error) {
    console.error(error);
    res.status(500).json(ApiResponse.error('Error creating user',500));
  }
};

// Get User
const getUser = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const merchantId = (req.user as JwtPayload)?.merchant_id; 
  try {
    const user = await userService.getUserById(parseInt(userId),merchantId);
    if (!user) {
      res.status(404).json(ApiResponse.error('User not found',404));
      return;
    }
    res.json(ApiResponse.success(user));
  } catch (error) {
    console.error(error);
    res.status(500).json(ApiResponse.error('Error retrieving user',500));
  }
};

// Update User
const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { fullName, email, password, groups  } = req.body;
  const merchantId = (req.user as JwtPayload)?.merchant_id; 
  try {
    const user = await userService.updateUser(
      parseInt(userId),
      fullName,
      email,
      merchantId,
      groups,
      password,
    );
    if (!user) {
      res.status(404).json(ApiResponse.error('User not found',404));
      return;
    }
    res.json(ApiResponse.success(user));
  } catch (error) {
    console.error(error);
    res.status(500).json(ApiResponse.error('Error updating user',500));
  }
};

// Delete User
const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const merchantId = (req.user as JwtPayload)?.merchant_id; 
  try {
    await userService.deleteUser(parseInt(userId),merchantId);
    res.status(204).send(ApiResponse.success('User deleted successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(ApiResponse.error('Error deleting user',500));
  }
};

export default {
  createUser,
  getUser,
  updateUser,
  deleteUser
}