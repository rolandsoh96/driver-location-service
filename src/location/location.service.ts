import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { Location, LocationHistory } from './location.schema';
import { CreateLocationDto } from './location.dto';
import { REDIS_CLIENT } from '../redis.module';

interface LocationData {
  driver_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}

@Injectable()
export class LocationService {
  private readonly CACHE_TTL = 60 * 60; // 1 hour in seconds

  constructor(
    @InjectModel(Location.name) private locationModel: Model<Location>,
    @InjectModel(LocationHistory.name)
    private locationHistoryModel: Model<LocationHistory>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async saveLocation(dto: CreateLocationDto): Promise<void> {
    const { driver_id, latitude, longitude } = dto;

    const currentTime = new Date();

    await this.locationModel.updateOne(
      { driver_id },
      { latitude, longitude, updated_at: currentTime },
      { upsert: true },
    );

    const locationData: Location = {
      driver_id,
      latitude,
      longitude,
      updated_at: currentTime,
    } as Location;

    await this.redis.setex(
      `driver:${driver_id}`,
      this.CACHE_TTL,
      JSON.stringify(locationData),
    );

    await this.locationHistoryModel.create({
      driver_id,
      latitude,
      longitude,
      timestamp: currentTime,
    });
  }

  async getLocation(driverId: string): Promise<Location | null> {
    const cachedLocation = await this.redis.get(`driver:${driverId}`);

    if (cachedLocation) {
      const parsed = JSON.parse(cachedLocation) as LocationData;
      return {
        ...parsed,
        updated_at: new Date(parsed.updated_at),
      } as Location;
    }

    const location = await this.locationModel
      .findOne({ driver_id: driverId })
      .lean();

    if (location) {
      await this.redis.setex(
        `driver:${driverId}`,
        this.CACHE_TTL,
        JSON.stringify(location),
      );
      return location;
    }

    return null;
  }

  async getLocationHistory(
    driverId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<LocationHistory[]> {
    return this.locationHistoryModel
      .find({
        driver_id: driverId,
        timestamp: { $gte: startTime, $lte: endTime },
      })
      .sort({ timestamp: -1 })
      .lean();
  }
}
