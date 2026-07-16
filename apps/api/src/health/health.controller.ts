import { Controller, Get } from '@nestjs/common';

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
