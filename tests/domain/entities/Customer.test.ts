import { Customer } from '../../../src/domain/entities/Customer';
import { CustomerTier } from '../../../src/domain/value-objects/CustomerTier';

describe('Customer Entity', () => {
  const validProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'customer@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+66812345678',
  };

  describe('create', () => {
    it('should create customer with valid props', () => {
      const customer = Customer.create(validProps);

      expect(customer.id).toBe(validProps.id);
      expect(customer.email).toBe(validProps.email);
      expect(customer.firstName).toBe(validProps.firstName);
      expect(customer.lastName).toBe(validProps.lastName);
      expect(customer.loyaltyPoints).toBe(0);
      expect(customer.tier).toBe(CustomerTier.BRONZE);
      expect(customer.isVerified).toBe(false);
    });

    it('should throw error for invalid email', () => {
      expect(() => Customer.create({ ...validProps, email: 'invalid' }))
        .toThrow('Valid email is required');
    });

    it('should throw error for empty first name', () => {
      expect(() => Customer.create({ ...validProps, firstName: '' }))
        .toThrow('First name is required');
    });
  });

  describe('fullName', () => {
    it('should return full name', () => {
      const customer = Customer.create(validProps);
      expect(customer.fullName).toBe('John Doe');
    });
  });

  describe('addLoyaltyPoints', () => {
    it('should add points correctly', () => {
      const customer = Customer.create(validProps);
      
      customer.addLoyaltyPoints(100);
      expect(customer.loyaltyPoints).toBe(100);

      customer.addLoyaltyPoints(50);
      expect(customer.loyaltyPoints).toBe(150);
    });

    it('should upgrade tier based on points', () => {
      const customer = Customer.create(validProps);
      
      customer.addLoyaltyPoints(1000);
      expect(customer.tier).toBe(CustomerTier.SILVER);

      customer.addLoyaltyPoints(4000); // Total: 5000
      expect(customer.tier).toBe(CustomerTier.GOLD);

      customer.addLoyaltyPoints(15000); // Total: 20000
      expect(customer.tier).toBe(CustomerTier.PLATINUM);
    });

    it('should throw error for negative points', () => {
      const customer = Customer.create(validProps);
      expect(() => customer.addLoyaltyPoints(-10)).toThrow();
    });
  });

  describe('deductLoyaltyPoints', () => {
    it('should deduct points correctly', () => {
      const customer = Customer.create(validProps);
      customer.addLoyaltyPoints(100);

      customer.deductLoyaltyPoints(30);
      expect(customer.loyaltyPoints).toBe(70);
    });

    it('should throw error for insufficient points', () => {
      const customer = Customer.create(validProps);
      customer.addLoyaltyPoints(50);

      expect(() => customer.deductLoyaltyPoints(100)).toThrow('Insufficient loyalty points');
    });
  });

  describe('verify', () => {
    it('should mark customer as verified', () => {
      const customer = Customer.create(validProps);
      expect(customer.isVerified).toBe(false);

      customer.verify();
      expect(customer.isVerified).toBe(true);
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields', () => {
      const customer = Customer.create(validProps);

      customer.updateProfile({
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+66898765432',
      });

      expect(customer.firstName).toBe('Jane');
      expect(customer.lastName).toBe('Smith');
      expect(customer.phone).toBe('+66898765432');
    });

    it('should update optional fields', () => {
      const customer = Customer.create(validProps);
      const dob = new Date('1990-01-01');

      customer.updateProfile({
        dateOfBirth: dob,
        gender: 'male',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      expect(customer.dateOfBirth).toBe(dob);
      expect(customer.gender).toBe('male');
      expect(customer.avatarUrl).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('updateEmail', () => {
    it('should update email and reset verification', () => {
      const customer = Customer.create(validProps);
      customer.verify();
      expect(customer.isVerified).toBe(true);

      customer.updateEmail('new@example.com');
      expect(customer.email).toBe('new@example.com');
      expect(customer.isVerified).toBe(false);
    });

    it('should throw error for invalid email', () => {
      const customer = Customer.create(validProps);
      expect(() => customer.updateEmail('invalid')).toThrow('Valid email is required');
    });
  });

  describe('activate/deactivate', () => {
    it('should deactivate customer', () => {
      const customer = Customer.create(validProps);
      expect(customer.isActive).toBe(true);

      customer.deactivate();
      expect(customer.isActive).toBe(false);
    });

    it('should activate customer', () => {
      const customer = Customer.create(validProps);
      customer.deactivate();

      customer.activate();
      expect(customer.isActive).toBe(true);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute customer from props', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      const customer = Customer.reconstitute({
        ...validProps,
        isActive: false,
        isVerified: true,
        loyaltyPoints: 500,
        tier: CustomerTier.SILVER,
        createdAt,
        updatedAt,
      });

      expect(customer.isActive).toBe(false);
      expect(customer.isVerified).toBe(true);
      expect(customer.loyaltyPoints).toBe(500);
      expect(customer.tier).toBe(CustomerTier.SILVER);
      expect(customer.createdAt).toBe(createdAt);
      expect(customer.updatedAt).toBe(updatedAt);
    });
  });

  describe('toObject', () => {
    it('should convert customer to object', () => {
      const customer = Customer.create(validProps);
      const obj = customer.toObject();

      expect(obj.id).toBe(validProps.id);
      expect(obj.email).toBe(validProps.email);
      expect(obj.firstName).toBe(validProps.firstName);
      expect(obj.lastName).toBe(validProps.lastName);
      expect(obj.isActive).toBe(true);
      expect(obj.isVerified).toBe(false);
      expect(obj.loyaltyPoints).toBe(0);
      expect(obj.tier).toBe(CustomerTier.BRONZE);
    });
  });

  describe('getters', () => {
    it('should return all properties', () => {
      const customer = Customer.create({
        ...validProps,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      expect(customer.phone).toBe('+66812345678');
      expect(customer.dateOfBirth).toBeInstanceOf(Date);
      expect(customer.gender).toBe('male');
      expect(customer.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(customer.createdAt).toBeInstanceOf(Date);
      expect(customer.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('validation', () => {
    it('should throw error for empty last name', () => {
      expect(() => Customer.create({ ...validProps, lastName: '' }))
        .toThrow('Last name is required');
    });

    it('should throw error for whitespace-only last name', () => {
      expect(() => Customer.create({ ...validProps, lastName: '   ' }))
        .toThrow('Last name is required');
    });
  });

  describe('deductLoyaltyPoints', () => {
    it('should throw error for negative deduction', () => {
      const customer = Customer.create(validProps);
      customer.addLoyaltyPoints(100);
      expect(() => customer.deductLoyaltyPoints(-10)).toThrow('Points cannot be negative');
    });
  });
});
