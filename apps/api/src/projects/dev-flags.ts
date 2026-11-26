// Development-only switch (project owner, 2026-11-26): DEV_ALLOW_SAME_SIGNER=true in apps/api/.env lets ONE account do what the SME's rules say needs
// at least two people (signing a gate or phase twice, proposing and confirming a formula version, closing one's own action, concluding one's own
// change, ...), so a single test account can walk the whole app. It is ignored whenever NODE_ENV is "production".
//
// The rules themselves are untouched: every place that would have refused calls `bypassable(error)`. When the switch is on, the refusal is
// recorded for this request and the action goes ahead; the response then carries an X-Dev-Bypass header naming each rule that was skipped, and
// the browser shows a warning toast for it, so nobody mistakes a bypassed run for the SME's logic accepting it.
import { AsyncLocalStorage } from 'node:async_hooks';
import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

const skipped = new AsyncLocalStorage<Set<string>>();

export function sameSignerAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.DEV_ALLOW_SAME_SIGNER === 'true';
}

// True (and noted for the response) when the switch is on; the caller then lets the action through instead of refusing it.
export function devBypass(rule: string): boolean {
  if (!sameSignerAllowed()) return false;
  skipped.getStore()?.add(rule);
  return true;
}

// Throw `error` unless the dev switch lets this one account through.
export function bypassable(error: HttpException): void {
  if (!devBypass(error.message)) throw error;
}

export const DEV_BYPASS_HEADER = 'X-Dev-Bypass';

@Injectable()
export class DevBypassInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!sameSignerAllowed()) return next.handle();
    const rules = new Set<string>();
    const res = context.switchToHttp().getResponse<{ setHeader?: (k: string, v: string) => void }>();
    return new Observable((subscriber) =>
      skipped.run(rules, () =>
        next
          .handle()
          .pipe(
            tap(() => {
              if (rules.size > 0) res.setHeader?.(DEV_BYPASS_HEADER, [...rules].map((r) => encodeURIComponent(r)).join(','));
            }),
          )
          .subscribe(subscriber),
      ),
    );
  }
}
