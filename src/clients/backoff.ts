import { timeout } from '../utils';
import { IBackoffTimer } from './types';

/**
 * Class implementing exponential-backoff timer.
 */
export class BackoffTimer implements IBackoffTimer {
    private backoffInitial = 1.0;
    private backoffMax = 120.0;
    private backoffJitter = 0.23;
    private backoffMultiplier = 1.6;
    private numRetries: number;
    private backoff: number;
    private deadline: number;

    constructor() {
        this.numRetries = 0;
        this.backoff = this.backoffInitial * 1000.0;
        this.deadline = Date.now() + this.backoff;
    }

    getNumRetries(): number {
        return this.numRetries;
    }

    getTimeout(): number {
        return this.getTimeUntilDeadline();
    }

    getTimeUntilDeadline(): number {
        return Math.max(this.deadline - Date.now(), 0.0);
    }

    async sleepUntilDeadline() {
        await timeout(this.getTimeUntilDeadline());

        // Apply multiplier to current backoff time
        this.backoff = Math.min(this.backoff * this.backoffMultiplier, this.backoffMax * 1000.0);

        // Get deadline by applying jitter as a proportion of backoff:
        // if jitter is 0.1, then multiply backoff by random value in [0.9, 1.1]
        this.deadline =
            Date.now() + this.backoff * (1 + this.backoffJitter * (2 * Math.random() - 1));
        this.numRetries++;
    }
}
