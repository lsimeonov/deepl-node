import { IBackoffTimer } from './types';
/**
 * Class implementing exponential-backoff timer.
 */
export declare class BackoffTimer implements IBackoffTimer {
    private backoffInitial;
    private backoffMax;
    private backoffJitter;
    private backoffMultiplier;
    private numRetries;
    private backoff;
    private deadline;
    constructor();
    getNumRetries(): number;
    getTimeout(): number;
    getTimeUntilDeadline(): number;
    sleepUntilDeadline(): Promise<void>;
}
