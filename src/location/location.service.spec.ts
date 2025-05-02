import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LocationService } from './location.service';
import { Location, LocationHistory } from './location.schema';
import { Model } from 'mongoose';
import { CreateLocationDto } from './location.dto';
import { REDIS_CLIENT } from '../redis.module';

const mockRedisClient = {
  setex: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
};

describe('LocationService', () => {
  let service: LocationService;
  let locationModel: Model<Location>;
  let locationHistoryModel: Model<LocationHistory>;

  const mockLocationModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
    lean: jest.fn(),
  };

  const mockLocationHistoryModel = {
    create: jest.fn(),
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: getModelToken(Location.name),
          useValue: mockLocationModel,
        },
        {
          provide: getModelToken(LocationHistory.name),
          useValue: mockLocationHistoryModel,
        },
        {
          provide: REDIS_CLIENT,
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    locationModel = module.get<Model<Location>>(getModelToken(Location.name));
    locationHistoryModel = module.get<Model<LocationHistory>>(
      getModelToken(LocationHistory.name),
    );

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveLocation', () => {
    it('should save location data and update cache', async () => {
      const dto: CreateLocationDto = {
        driver_id: 'test-driver',
        latitude: 40.7128,
        longitude: -74.006,
      };

      mockLocationModel.updateOne.mockResolvedValue({ ok: 1 });
      mockLocationHistoryModel.create.mockResolvedValue({});

      await service.saveLocation(dto);

      expect(mockLocationModel.updateOne).toHaveBeenCalledWith(
        { driver_id: dto.driver_id },
        expect.objectContaining({
          latitude: dto.latitude,
          longitude: dto.longitude,
          updated_at: expect.any(Date),
        }),
        { upsert: true },
      );
      expect(mockLocationHistoryModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          driver_id: dto.driver_id,
          latitude: dto.latitude,
          longitude: dto.longitude,
          timestamp: expect.any(Date),
        }),
      );
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });
  });

  describe('getLocation', () => {
    it('should return location from cache if available', async () => {
      const testDate = new Date('2025-05-02T05:42:46.157Z');
      const cachedLocation = {
        driver_id: 'test-driver',
        latitude: 40.7128,
        longitude: -74.006,
        updated_at: testDate,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedLocation));

      const result = await service.getLocation('test-driver');

      expect(result).toEqual({
        ...cachedLocation,
        updated_at: new Date(testDate),
      });
      expect(mockLocationModel.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database and update cache if not in cache', async () => {
      const testDate = new Date('2025-05-02T05:42:46.157Z');
      const dbLocation = {
        driver_id: 'test-driver',
        latitude: 40.7128,
        longitude: -74.006,
        updated_at: testDate,
      };

      mockRedisClient.get.mockResolvedValue(null);
      mockLocationModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(dbLocation),
      });

      const result = await service.getLocation('test-driver');

      expect(result).toEqual({
        ...dbLocation,
        updated_at: new Date(testDate),
      });
      expect(mockLocationModel.findOne).toHaveBeenCalledWith({
        driver_id: 'test-driver',
      });
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'driver:test-driver',
        3600,
        JSON.stringify(dbLocation),
      );
    });

    it('should return null if location not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockLocationModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getLocation('test-driver');

      expect(result).toBeNull();
    });
  });

  describe('getLocationHistory', () => {
    it('should return location history within time range', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-02');
      const mockHistory = [
        {
          driver_id: 'test-driver',
          latitude: 40.7128,
          longitude: -74.006,
          timestamp: new Date('2024-01-01T12:00:00'),
        },
      ];

      mockLocationHistoryModel.lean.mockResolvedValue(mockHistory);

      const result = await service.getLocationHistory(
        'test-driver',
        startTime,
        endTime,
      );

      expect(mockLocationHistoryModel.find).toHaveBeenCalledWith({
        driver_id: 'test-driver',
        timestamp: { $gte: startTime, $lte: endTime },
      });
      expect(mockLocationHistoryModel.sort).toHaveBeenCalledWith({
        timestamp: -1,
      });
      expect(result).toEqual(mockHistory);
    });
  });
});
