import * as assert from 'assert';
import {Transform, TransformOptions} from 'stream';


export default class Parser extends Transform {
    public lastElement: string;
    public nLines: number = 0;
    private _foundFirst: boolean = false;
    private _reminder: Buffer | undefined;

    constructor(public globalTradeID: number, options: TransformOptions = {}) {
        super({...options, readableObjectMode: true});
        this.globalTradeID = globalTradeID;
    }

    _transform(chunk: Buffer, _encoding: string, callback: Function): void {
        // Unoptimal memory copying :(
        if (this._reminder && this._reminder.length) {
            chunk = Buffer.concat([this._reminder, chunk]);
        }

        let offset = 0;
        do {
            const found = findObjectElement(chunk, offset);
            if (!found) {
                break;
            }

            offset = found.endIdx;

            if (!this._foundFirst) {
                const obj = JSON.parse(found.object);
                this._foundFirst = (obj.globalTradeID && +obj.globalTradeID < this.globalTradeID);
            }

            if (this._foundFirst) {
                this.nLines++;
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
