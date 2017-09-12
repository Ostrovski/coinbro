import * as assert from 'assert';
import { PassThrough, Transform, TransformOptions } from 'stream';
import * as moment from 'moment-timezone';
import { Duration, Moment } from 'moment-timezone';
import * as request from 'request';


export default class TradeHistory extends PassThrough {
    private _currencyPair: string;
    private _start: moment.Moment;
    private _end: moment.Moment;
    private _reading: boolean = false;
    private _rateLimit: number = 1000/4;

    constructor(
        currencyPair: string,
        startAt: string,
        endAt: string = '',
    ) {
        super({ objectMode: true });
        this._currencyPair = currencyPair;
        this._start = moment(startAt);
        this._end = endAt ? moment(endAt) : moment.utc();
    }

    _read(size: number): void {
        if (!this._reading) {
            this._reading = true;
            this._fetch(this._end);
        }
        return super._read(size);
    }

    _fetch(end: Moment, globalTradeID: number = +Infinity): void {
        const period = createPeriod(this._start, end);
        const transformer = new Transformer(globalTradeID);
        const beginAt = Date.now();

        fetch(this._currencyPair, period)
            .once('error', (err) => {
                transformer.emit('error', err);
                this.push(null);  // 0 tolerance
            })
            .pipe(transformer)
            .once('error', (err) => {
                this.emit('error', err);
                this.push(null);  // 0 tolerance
            })
            .once('end', () => {
                const elapsed = Date.now() - beginAt;
                this.emit('chunk', {
                    period,
                    elapsed,
                    lines: transformer.nLines,
                });

                if (transformer.lastElement) {
                    const lastLine = JSON.parse(transformer.lastElement);
                    globalTradeID = +lastLine.globalTradeID;
                    end = moment(lastLine.date);
                } else {
                    end = period.start;
                }

                if (end.diff(this._start) <= 0) {
                    this.push(null);
                    return;
                }

                setTimeout(() => {
                    this._fetch(end, globalTradeID);
                }, this._rateLimit)
            })
            .pipe(this, { end: true })
    }
}


function fetch(currencyPair: string, period: Period, apiUrl: string = 'https://poloniex.com/public') {
    return request.get(apiUrl, {qs: {
        command: 'returnTradeHistory',
        currencyPair: currencyPair,
        start: period.start.unix(),
        end: period.end.unix(),
    }});
}

interface Period {
    start: Moment;
    end: Moment;
}

function createPeriod(
    start: Moment,
    end: Moment,
    maxInterval: Duration = moment.duration(30, 'd')
): Period {
    return {
        start: moment.max(start, end.clone().subtract(maxInterval)),
        end,
    };
}

class Transformer extends Transform {
    public lastElement: string;
    public nLines: number = 0;
    private _foundFirst: boolean = false;
    private _reminder: Buffer | undefined;

    constructor(public globalTradeID: number, options: TransformOptions = {}) {
        super({ ...options, readableObjectMode: true });
        this.globalTradeID = globalTradeID;
    }

    _transform(chunk: Buffer, _encoding: string, callback: Function): void {
        // Unoptimal memory copying :(
        if (this._reminder) {
            chunk = Buffer.concat([this._reminder, chunk]);
        }

        let offset = 0;
        do {
            const found = findObjectElement(chunk, offset);
            if (!found) {
                break;
            }

            this.nLines++;
            offset = found.endIdx;

            if (!this._foundFirst) {
                const obj = JSON.parse(found.object);
                this._foundFirst = (obj.globalTradeID && +obj.globalTradeID < this.globalTradeID);
            }

            if (this._foundFirst) {
                this.lastElement = found.object;
                this.push(found.object);
            }
        } while (true);

        this._reminder = chunk.slice(offset);  // poor man's unshift()
        callback();
    }
}

const CHAR_CODE_OPENING_BRACE = '{'.charCodeAt(0);
const CHAR_CODE_CLOSING_BRACE = '}'.charCodeAt(0);

function findCharIndex(chunk: Buffer, charCode: number, offset: number = 0): number {
    let idx = offset;
    while (idx < chunk.length && chunk[idx] !== charCode) {
        idx++;
    }
    return idx;
}

function findClosingBrace(chunk: Buffer, offset: number = 0): number {
    assert(chunk[offset] === CHAR_CODE_OPENING_BRACE);

    let idx = offset + 1;
    let level = 0;
    while (idx < chunk.length) {
        if (chunk[idx] === CHAR_CODE_OPENING_BRACE) {
            level++;
        }
        if (chunk[idx] === CHAR_CODE_CLOSING_BRACE) {
            level--;
        }
        if (level < 0) {
            return idx;
        }
        idx++;
    }

    return idx;
}

function findObjectElement(chunk: Buffer, offset: number = 0): { object: string, endIdx: number } | undefined {
    const startIdx = findCharIndex(chunk, CHAR_CODE_OPENING_BRACE, offset);
    if (startIdx >= chunk.length) {
        return undefined;
    }

    const endIdx = findClosingBrace(chunk, startIdx);
    if (endIdx >= chunk.length) {
        return undefined;
    }

    return {
        object: `${chunk.slice(startIdx, endIdx + 1).toString('utf8')}\n`,
        endIdx: endIdx + 1,
    }
}
