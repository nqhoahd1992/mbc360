import { Controller, Get } from '@nestjs/common';
import { GATES, PHASES } from '@mbc360/shared/config/gates';

// Read-only phase/gate metadata, served from the same @mbc360/shared config
// the frontend renders from — proves web and api run off one rule source.
@Controller('meta')
export class MetaController {
  @Get('phases')
  phases() {
    return PHASES;
  }

  @Get('gates')
  gates() {
    return GATES;
  }
}
