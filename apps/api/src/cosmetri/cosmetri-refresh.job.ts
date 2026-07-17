import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CosmetriTokenService } from './cosmetri-token.service';

// Access tokens expire after 1 hour (docs/swagger-init.json); ticking every
// 10 minutes with a 15-minute buffer refreshes each token 3-5 times within
// its life, comfortably before it (or the connection check itself) can lapse.
const REFRESH_BUFFER_MINUTES = 15;

@Injectable()
export class CosmetriRefreshJob {
  constructor(private readonly tokens: CosmetriTokenService) {}

  @Cron('*/10 * * * *')
  async tick(): Promise<void> {
    await this.tokens.refreshIfNeeded(REFRESH_BUFFER_MINUTES);
  }
}
