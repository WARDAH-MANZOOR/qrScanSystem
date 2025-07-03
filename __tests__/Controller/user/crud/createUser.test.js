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
describe('createUser', () => {
    it('should create a user and return 201', async () => {
        const mockRequest = {
            body: {
                fullName: 'John Doe',
                email: 'john.doe@example.com',
                password: 'password123',
                groups: ['group1']
            },
            user: { merchant_id: 1 } // mock merchant_id
        };
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        userService.createUser.mockResolvedValue(mockRequest.body);

        await userController.createUser(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(ApiResponse.success(mockRequest.body));
    });

    it('should handle errors and return 500', async () => {
        const mockRequest = {
            body: {
                fullName: 'John Doe',
                email: 'john.doe@example.com',
                password: 'password123',
                groups: ['group1']
            },
            user: { merchant_id: 1 }
        };
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        userService.createUser.mockRejectedValue(new Error('Error creating user'));

        await userController.createUser(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(ApiResponse.error('Error creating user', 500));
    });
});
