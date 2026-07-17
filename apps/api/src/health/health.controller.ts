import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  // Used by the Docker HEALTHCHECK and any uptime monitor.
  @Get()
  health() {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
