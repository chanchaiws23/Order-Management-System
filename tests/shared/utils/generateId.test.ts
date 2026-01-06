import { UuidGenerator, generateId } from '../../../src/shared/utils/generateId';

describe('generateId', () => {
  describe('UuidGenerator', () => {
    it('should generate valid UUID format', () => {
      const generator = new UuidGenerator();
      const uuid = generator.generate();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const generator = new UuidGenerator();
      const uuids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        uuids.add(generator.generate());
      }

      expect(uuids.size).toBe(100);
    });
  });

  describe('generateId function', () => {
    it('should generate valid UUID', () => {
      const uuid = generateId();

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 50; i++) {
        ids.add(generateId());
      }

      expect(ids.size).toBe(50);
    });
  });
});
