import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { Location, LocationHistory } from './location.schema';
import { CreateLocationDto } from './location.dto';

@Injectable()
export class LocationService {
  private redis: Redis;

  constructor(
    @InjectModel(Location.name) private locationModel: Model<Location>,
    @InjectModel(LocationHistory.name)
    private locationHistoryModel: Model<LocationHistory>,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

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

    await this.redis.set(`driver:${driver_id}`, JSON.stringify(locationData));

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
      return JSON.parse(cachedLocation) as Location;
    }

    const location = await this.locationModel
      .findOne({ driver_id: driverId })
      .lean();

    if (location) {
      await this.redis.set(`driver:${driverId}`, JSON.stringify(location));
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
