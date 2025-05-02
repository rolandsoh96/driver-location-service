import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LocationController', () => {
  let controller: LocationController;
  let service: LocationService;

  const mockLocationService = {
    saveLocation: jest.fn(),
    getLocation: jest.fn(),
    getLocationHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [
        {
          provide: LocationService,
          useValue: mockLocationService,
        },
      ],
    }).compile();

    controller = module.get<LocationController>(LocationController);
    service = module.get<LocationService>(LocationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createLocation', () => {
    it('should create a location', async () => {
      const dto = {
        driver_id: 'test-driver',
        latitude: 40.7128,
        longitude: -74.006,
      };

      mockLocationService.saveLocation.mockResolvedValue(undefined);

      const result = await controller.createLocation(dto);
      expect(result).toEqual({ status: 'success' });
    });

    it('should pass the DTO to the service', async () => {
      const dto = {
        driver_id: 'test-driver',
        latitude: 40.7128,
        longitude: -74.006,
      };

      await controller.createLocation(dto);
      expect(mockLocationService.saveLocation).toHaveBeenCalledWith(dto);
    });
  });

  describe('getLocation', () => {
    it('should get a location', async () => {
      const location = {
        driver_id: 'test-driver',
        latitude: 40.7128,
        longitude: -74.006,
      };

      mockLocationService.getLocation.mockResolvedValue(location);

      const result = await controller.getLocation('test-driver');
      expect(result).toEqual(location);
    });

    it('should throw BadRequestException when driver_id is missing', async () => {
      await expect(controller.getLocation('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when location is not found', async () => {
      mockLocationService.getLocation.mockResolvedValue(null);
      await expect(controller.getLocation('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getLocationHistory', () => {
    it('should get location history', async () => {
      const history = [
        {
          driver_id: 'test-driver',
          latitude: 40.7128,
          longitude: -74.006,
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          driver_id: 'test-driver',
          latitude: 40.7129,
          longitude: -74.0061,
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
      ];

      mockLocationService.getLocationHistory.mockResolvedValue(history);

      const result = await controller.getLocationHistory(
        'test-driver',
        '2024-01-01T10:00:00Z',
        '2024-01-01T10:02:00Z',
      );

      expect(result).toEqual(history);
      expect(mockLocationService.getLocationHistory).toHaveBeenCalledWith(
        'test-driver',
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T10:02:00Z'),
      );
    });

    it('should throw BadRequestException when driver_id is missing', async () => {
      await expect(
        controller.getLocationHistory(
          '',
          '2024-01-01T10:00:00Z',
          '2024-01-01T10:02:00Z',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when start_time is missing', async () => {
      await expect(
        controller.getLocationHistory(
          'test-driver',
          '',
          '2024-01-01T10:02:00Z',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when end_time is missing', async () => {
      await expect(
        controller.getLocationHistory(
          'test-driver',
          '2024-01-01T10:00:00Z',
          '',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when all required parameters are missing', async () => {
      await expect(controller.getLocationHistory('', '', '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
