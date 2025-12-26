import * as userService from '../../../../dist/services/user/crud.js';
import ApiResponse from '../../../../dist/utils/ApiResponse.js';
import userController from '../../../../dist/controller/user/crud.js'; // Import the controller function

jest.mock('../../../../dist/services/user/crud.js'); // Mocking the userService
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });

  describe('deleteUser', () => {
    it('should delete a user and return 204', async () => {
        const mockRequest = {
            params: { userId: '1' },
            user: { merchant_id: 1 }
        };
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };

        userService.deleteUser.mockResolvedValue(true);

        await userController.deleteUser(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(204);
        expect(mockResponse.send).toHaveBeenCalledWith(ApiResponse.success('User deleted successfully'));
    });

    it('should return 404 if user not found', async () => {
        const mockRequest = {
            params: { userId: '1' },
            user: { merchant_id: 1 }
        };
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        userService.deleteUser.mockResolvedValue(null);

        await userController.deleteUser(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(ApiResponse.error('User not found', 404));
    });

    it('should return 500 on error', async () => {
        const mockRequest = {
            params: { userId: '1' },
            user: { merchant_id: 1 }
        };
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        userService.deleteUser.mockRejectedValue(new Error('Error deleting user'));

        await userController.deleteUser(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(ApiResponse.error('Error deleting user', 500));
    });
});
