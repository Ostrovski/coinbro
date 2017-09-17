import {Readable} from 'stream';
import TradeHistory from './TradeHistory';
import {Timestamp} from './times';


function createReadStream(
    currencyPair: string,
    start: Date | Timestamp,
    end?: Date | Timestamp,
    rateLimit?: number,
): Readable {
    return new TradeHistory(currencyPair, +start, end ? +end : end, rateLimit);
}

export {
    createReadStream,
};
