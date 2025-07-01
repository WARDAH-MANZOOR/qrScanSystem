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
describe('getUsers', () => {
    it('should return 200 if users are found', async () => {
        const mockRequest = { user: { merchant_id: 1 } };
        const mockResponse = {
            json: jest.fn()
        };

        const mockUsers = [{ fullName: 'John Doe', email: 'john.doe@example.com' }];
        userService.getUsers.mockResolvedValue(mockUsers);

        await userController.getUsers(mockRequest, mockResponse);

        expect(mockResponse.json).toHaveBeenCalledWith(ApiResponse.success(mockUsers));
    });

    it('should return 404 if no users are found', async () => {
        const mockRequest = { user: { merchant_id: 1 } };
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        userService.getUsers.mockResolvedValue(null);

        await userController.getUsers(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(ApiResponse.error('User not found', 404));
    });

    it('should return 500 on error', async () => {
        const mockRequest = { user: { merchant_id: 1 } };
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        userService.getUsers.mockRejectedValue(new Error('Error retrieving user'));

        await userController.getUsers(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(ApiResponse.error('Error retrieving user', 500));
    });
});
