import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface LocationLog {
  driver_id: string;
  latitude: number;
  longitude: number;
  time_offset_sec: number;
}

async function publishUpdates() {
  const filePath = path.join(__dirname, '../../driver_location_log.json');
  const logs = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LocationLog[];
  const T0 = Date.now();
  let successCount = 0;
  let errorCount = 0;

  for (const log of logs) {
    const delay = log.time_offset_sec * 1000 - (Date.now() - T0);
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      await axios.post('http://localhost:3000/location', {
        driver_id: log.driver_id,
        latitude: log.latitude,
        longitude: log.longitude,
      });
      successCount++;
      console.log(
        `Sent update ${successCount} for driver ${log.driver_id} at ${log.time_offset_sec}s`,
      );
    } catch (error) {
      errorCount++;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `Error sending update for driver ${log.driver_id}:`,
        errorMessage,
      );
    }
  }
  console.log(`Completed: ${successCount} successful, ${errorCount} failed`);
}

publishUpdates().catch(console.error);
