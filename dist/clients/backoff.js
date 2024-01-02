"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackoffTimer = void 0;
const utils_1 = require("../utils");
/**
 * Class implementing exponential-backoff timer.
 */
class BackoffTimer {
    constructor() {
        this.backoffInitial = 1.0;
        this.backoffMax = 120.0;
        this.backoffJitter = 0.23;
        this.backoffMultiplier = 1.6;
        this.numRetries = 0;
        this.backoff = this.backoffInitial * 1000.0;
        this.deadline = Date.now() + this.backoff;
    }
    getNumRetries() {
        return this.numRetries;
    }
    getTimeout() {
        return this.getTimeUntilDeadline();
    }
    getTimeUntilDeadline() {
        return Math.max(this.deadline - Date.now(), 0.0);
    }
    async sleepUntilDeadline() {
        await (0, utils_1.timeout)(this.getTimeUntilDeadline());
        // Apply multiplier to current backoff time
        this.backoff = Math.min(this.backoff * this.backoffMultiplier, this.backoffMax * 1000.0);
        // Get deadline by applying jitter as a proportion of backoff:
        // if jitter is 0.1, then multiply backoff by random value in [0.9, 1.1]
        this.deadline =
            Date.now() + this.backoff * (1 + this.backoffJitter * (2 * Math.random() - 1));
        this.numRetries++;
    }
}
exports.BackoffTimer = BackoffTimer;
