import {PassThrough} from 'stream';
import {fetch, FetchFn} from './fetch';
import Parser from './Parser';
import {Timestamp, createPeriod} from './times';


export default class TradeHistory extends PassThrough {
    private _currencyPair: string;
    private _start: Timestamp;
    private _end: Timestamp;
    private _rateLimit: number;
    private _fetchFn: FetchFn;
    private _reading: boolean = false;

    constructor(currencyPair: string,
                startAt: Timestamp,
                endAt: Timestamp = 0,
                rateLimit: number = 1000/4,
                fetchFn: FetchFn = fetch) {
        super({objectMode: true});
        this._currencyPair = currencyPair;
        this._start = startAt;
        this._end = endAt || Date.now();
        this._rateLimit = rateLimit;
        this._fetchFn = fetchFn;
    }

    _read(size: number): void {
        if (!this._reading) {
            this._reading = true;
            this._fetch(this._end);
        }
        return super._read(size);
    }

    _fetch(end: Timestamp, globalTradeID: number = +Infinity): void {
        const period = createPeriod(this._start, end);
        const parser = new Parser(globalTradeID);
        const beginAt = Date.now();

        this._fetchFn(this._currencyPair, period)
            .then(response => response
                .once('error', (err) => {
                    parser.emit('error', err);
                    this.push(null);  // 0 tolerance
                })
                .pipe(parser)
                .once('error', (err) => {
                    this.emit('error', err);
                    this.push(null);  // 0 tolerance
                })
                .once('end', () => {
                    parser.unpipe(this);

                    this.emit('chunk', {
                        period,
                        elapsed: Date.now() - beginAt,
                        lines: parser.nLines,
                    });

                    if (parser.lastElement) {
                        const lastLine = JSON.parse(parser.lastElement);
                        globalTradeID = +lastLine.globalTradeID;
                        end = +(new Date(lastLine.date + ' +00'));
                    } else {
                        end = period.start;
                    }

                    if (end <= this._start) {
                        this.push(null);
                        return;
                    }

                    setTimeout(() => {
                        this._fetch(end, globalTradeID);
                    }, this._rateLimit)
                })
                .pipe(this, {end: false}))
            .catch(err => {
                this.emit('error', err);
                this.push(null);  // 0 tolerance
            });
    }
}
