export type Timestamp = number;

const POLO_MAX_DURATION = 30 * 24 * 60 * 60 * 1000;  // 30 d

export interface Period {
    start: Timestamp;
    end: Timestamp;
}

export function createPeriod(
    start: Timestamp,
    end: Timestamp,
    maxDuration: Timestamp = POLO_MAX_DURATION,
): Period {
    return {
        start: Math.max(start, end - maxDuration),
        end,
    };
}
