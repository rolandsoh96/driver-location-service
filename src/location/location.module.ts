import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import {
  Location,
  LocationSchema,
  LocationHistory,
  LocationHistorySchema,
} from './location.schema';
import { RedisModule } from '../redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Location.name, schema: LocationSchema },
      { name: LocationHistory.name, schema: LocationHistorySchema },
    ]),
    RedisModule,
  ],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationModule {}
