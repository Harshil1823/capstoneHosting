const ChangeRequest = require('../models/changeRequest');
const { createChangeRequest, listChangeRequests } = require('../controllers/requestRoute');

jest.mock('../models/changeRequest');

describe('createChangeRequest Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                title: 'Test Change Request',
                affectedUser: 'User123',
                department: 'IT',
                description: 'This is a test request',
            },
            user: {
                _id: 'user123',
                company: 'CompanyABC'
            },
            flash: jest.fn(),
        };

        res = {
            redirect: jest.fn(),
        };
    });

    it('should create a new change request and redirect', async () => {
        ChangeRequest.prototype.save = jest.fn().mockResolvedValue({});

        await createChangeRequest(req, res);

        expect(ChangeRequest).toHaveBeenCalledWith({
            title: 'Test Change Request',
            description: 'This is a test request',
            requester: 'user123',
            affectedUser: 'User123',
            department: 'IT',
            company: 'CompanyABC',
        });

        expect(req.flash).toHaveBeenCalledWith('success', 'Request submitted successfully!');
        expect(res.redirect).toHaveBeenCalledWith('/requests');
    });
    it('should handle errors and redirect to /requests/new', async () => {
        ChangeRequest.prototype.save = jest.fn().mockRejectedValue(new Error('Database Error'));

        await createChangeRequest(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', 'Something went wrong. Please try again.');
        expect(res.redirect).toHaveBeenCalledWith('/requests/new');
    });
});

describe('listChangeRequests Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: {
                company: 'CompanyABC'
            },
            flash: jest.fn(),
        };

        res = {
            render: jest.fn(),
            redirect: jest.fn(),
        };
    });

    it('should fetch and render change requests successfully', async () => {
        const mockRequests = [
            { _id: '1', title: 'Request 1', requester: { username: 'user1' } },
            { _id: '2', title: 'Request 2', requester: { username: 'user2' } }
        ];

        ChangeRequest.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockRequests),
        });

        await listChangeRequests(req, res);

        expect(ChangeRequest.find).toHaveBeenCalledWith({ company: 'CompanyABC' });
        expect(res.render).toHaveBeenCalledWith('requests/index', { requests: mockRequests });
    });

    it('should handle errors and redirect to home', async () => {
        ChangeRequest.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockRejectedValue(new Error('Database Error')),
        });

        await listChangeRequests(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', 'Unable to fetch change requests.');
        expect(res.redirect).toHaveBeenCalledWith('/');
    });
});