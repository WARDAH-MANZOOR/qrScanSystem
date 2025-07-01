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
describe('updateUser', () => {
    it('should update a user and return 200', async () => {
        const mockRequest = {
            params: { userId: '1' },
            body: {
                fullName: 'Jane Doe',
                email: 'jane.doe@example.com',
                password: 'newpassword',
                groups: ['group2']
            },
            user: { merchant_id: 1 }
        };
        const mockResponse = {
            json: jest.fn()
        };

        const updatedUser = { ...mockRequest.body, id: 1 };
        userService.updateUser.mockResolvedValue(updatedUser);

        await userController.updateUser(mockRequest, mockResponse);

        expect(mockResponse.json).toHaveBeenCalledWith(ApiResponse.success(updatedUser));
    });

    it('should return 404 if user not found', async () => {
        const mockRequest = {
            params: { userId: '1' },
            body: {
                fullName: 'Jane Doe',
                email: 'jane.doe@example.com',
                password: 'newpassword',
                groups: ['group2']
            },
            user: { merchant_id: 1 }
        };
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        userService.updateUser.mockResolvedValue(null);

        await userController.updateUser(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(ApiResponse.error('User not found', 404));
    });

    it('should return 500 on error', async () => {
        const mockRequest = {
            params: { userId: '1' },
            body: {
                fullName: 'Jane Doe',
                email: 'jane.doe@example.com',
                password: 'newpassword',
                groups: ['group2']
            },
            user: { merchant_id: 1 }
        };
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        userService.updateUser.mockRejectedValue(new Error('Error updating user'));

        await userController.updateUser(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(ApiResponse.error('Error updating user', 500));
    });
});
