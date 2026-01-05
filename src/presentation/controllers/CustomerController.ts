import { Request, Response, NextFunction } from 'express';
import { CustomerUseCases } from '../../application/use-cases/CustomerUseCases';
import { LogExecutionTime } from '../decorators/LogExecutionTime';

export class CustomerController {
  constructor(private readonly customerUseCases: CustomerUseCases) {}

  createCustomer = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const customer = await this.customerUseCases.createCustomer(req.body);
        res.status(201).json({ success: true, data: customer.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getCustomer = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const customer = await this.customerUseCases.getCustomerById(req.params.id);
        if (!customer) {
          res.status(404).json({ success: false, error: 'Customer not found' });
          return;
        }
        res.json({ success: true, data: customer.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  updateCustomer = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const customer = await this.customerUseCases.updateCustomer(req.params.id, req.body);
        res.json({ success: true, data: customer.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  deleteCustomer = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        await this.customerUseCases.deleteCustomer(req.params.id);
        res.json({ success: true, message: 'Customer deleted' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getAllCustomers = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await this.customerUseCases.getAllCustomers({ page, limit });
        res.json({ success: true, ...result, data: result.data.map(c => c.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  searchCustomers = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { email, name, tier, isActive, isVerified, page, limit } = req.query;
        const result = await this.customerUseCases.searchCustomers(
          { email: email as string, name: name as string, tier: tier as string, 
            isActive: isActive === 'true', isVerified: isVerified === 'true' },
          { page: parseInt(page as string) || 1, limit: parseInt(limit as string) || 10 }
        );
        res.json({ success: true, ...result, data: result.data.map(c => c.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  createAddress = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const address = await this.customerUseCases.createAddress({ ...req.body, customerId: req.params.id });
        res.status(201).json({ success: true, data: address.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getAddresses = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const addresses = await this.customerUseCases.getCustomerAddresses(req.params.id);
        res.json({ success: true, data: addresses.map(a => a.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  deleteAddress = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        await this.customerUseCases.deleteAddress(req.params.addressId);
        res.json({ success: true, message: 'Address deleted' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );
}
