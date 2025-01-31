import * as userService from '../../services/user/crud.js';
import ApiResponse from '../../utils/ApiResponse.js';
// Create User
const createUser = async (req, res) => {
    const { fullName, email, password, groups } = req.body;
    const merchantId = req.user?.merchant_id;
    try {
        const user = await userService.createUser(fullName, email, password, groups, merchantId);
        res.status(201).json(ApiResponse.success(user));
    }
    catch (error) {
        console.error(error);
        res.status(500).json(ApiResponse.error('Error creating user', 500));
    }
};
// Get User
const getUsers = async (req, res) => {
    const merchantId = req.user?.merchant_id;
    try {
        const user = await userService.getUsers(merchantId);
        if (!user) {
            res.status(404).json(ApiResponse.error('User not found', 404));
            return;
        }
        res.json(ApiResponse.success(user));
    }
    catch (error) {
        console.error(error);
        res.status(500).json(ApiResponse.error('Error retrieving user', 500));
    }
};
// Update User
const updateUser = async (req, res) => {
    const { userId } = req.params;
    const { fullName, email, password, groups } = req.body;
    const merchantId = req.user?.merchant_id;
    try {
        const user = await userService.updateUser(parseInt(userId), fullName, email, merchantId, groups, password);
        if (!user) {
            res.status(404).json(ApiResponse.error('User not found', 404));
            return;
        }
        res.json(ApiResponse.success(user));
    }
    catch (error) {
        console.error(error);
        res.status(500).json(ApiResponse.error('Error updating user', 500));
    }
};
// Delete User
const deleteUser = async (req, res) => {
    const { userId } = req.params;
    const merchantId = req.user?.merchant_id;
    try {
        const result = await userService.deleteUser(parseInt(userId), merchantId);
        if (!result) {
            res.status(404).json(ApiResponse.error('User not found', 404));
            return;
        }
        res.status(204).send(ApiResponse.success('User deleted successfully'));
    }
    catch (error) {
        console.error(error);
        res.status(500).json(ApiResponse.error('Error deleting user', 500));
    }
};
export default {
    createUser,
    getUsers,
    updateUser,
    deleteUser
};
