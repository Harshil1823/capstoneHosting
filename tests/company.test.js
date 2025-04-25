const Company = require('../models/company');
const Analytics = require('../models/analytics');
const { createCompany, renderCompanyForm } = require('../controllers/companyController');

jest.mock('../models/company');
jest.mock('../models/analytics');

describe('Company Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                name: 'Test Company',
                street: '123 Main St',
                city: 'Test City',
                state: 'TS',
                zipCode: '12345'
            },
            flash: jest.fn(),
            params: { id: 'company123' }
        };

        res = {
            render: jest.fn(),
            redirect: jest.fn(),
        };
    });

    describe('renderCompanyForm', () => {
        it('should render the company creation form', () => {
            renderCompanyForm(req, res);
            expect(res.render).toHaveBeenCalledWith('companies/new');
        });
    });

    describe('createCompany', () => {
        it('should create a new company and initialize analytics', async () => {
            const mockCompany = { _id: 'company123', save: jest.fn() };
            Company.mockImplementation(() => mockCompany);
            Analytics.create.mockResolvedValue({});

            await createCompany(req, res);

            expect(mockCompany.save).toHaveBeenCalled();
            expect(Analytics.create).toHaveBeenCalledWith(expect.objectContaining({
                company: 'company123'
            }));
            expect(req.flash).toHaveBeenCalledWith('success', expect.stringContaining('Company created successfully!'));
            expect(res.redirect).toHaveBeenCalledWith('/companies/company123');
        });

        it('should handle errors during company creation', async () => {
            Company.mockImplementation(() => ({
                save: jest.fn().mockRejectedValue(new Error('Database Error'))
            }));

            await createCompany(req, res);

            expect(req.flash).toHaveBeenCalledWith('error', 'Error creating company. Please try again.');
            expect(res.redirect).toHaveBeenCalledWith('/companies/new');
        });
    });
});
