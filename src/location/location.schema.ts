import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Location extends Document {
  @Prop({ required: true, index: true, unique: true })
  driver_id: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ default: Date.now })
  updated_at: Date;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

@Schema()
export class LocationHistory extends Document {
  @Prop({ required: true })
  driver_id: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const LocationHistorySchema =
  SchemaFactory.createForClass(LocationHistory);
LocationHistorySchema.index({ driver_id: 1, timestamp: -1 });
LocationHistorySchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);
