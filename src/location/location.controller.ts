import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { CreateLocationDto } from './location.dto';
import { Location, LocationHistory } from './location.schema';

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  async createLocation(
    @Body() createLocationDto: CreateLocationDto,
  ): Promise<{ status: string }> {
    await this.locationService.saveLocation(createLocationDto);
    return { status: 'success' };
  }

  @Get()
  async getLocation(@Query('driver_id') driverId: string): Promise<Location> {
    if (!driverId) {
      throw new BadRequestException('driver_id is required');
    }

    const location = await this.locationService.getLocation(driverId);

    if (!location) {
      throw new NotFoundException(`Location for driver ${driverId} not found`);
    }

    return location;
  }

  @Get('history')
  async getLocationHistory(
    @Query('driver_id') driverId: string,
    @Query('start_time') startTime: string,
    @Query('end_time') endTime: string,
  ): Promise<LocationHistory[]> {
    if (!driverId || !startTime || !endTime) {
      throw new BadRequestException(
        'driver_id, start_time, and end_time are required',
      );
    }

    const history = await this.locationService.getLocationHistory(
      driverId,
      new Date(startTime),
      new Date(endTime),
    );

    return history;
  }
}
