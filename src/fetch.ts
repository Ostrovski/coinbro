import * as http from 'https';
import * as querystring from 'querystring';
import {Readable} from 'stream';
import {URL} from 'url';
import {Period} from './times';


export type FetchFn = (currencyPair: string, period: Period) => Promise<Readable>;

export function fetch(
    currencyPair: string,
    period: Period,
    apiUrl: string = 'https://poloniex.com/public'
): Promise<Readable> {
    return new Promise(resolve => {
        const query = querystring.stringify({
            command: 'returnTradeHistory',
            currencyPair: currencyPair,
            start: Math.floor(period.start / 1000),
            end: Math.floor(period.end / 1000),
        });
        const options = new URL(apiUrl + '?' + query);
        http.request(options, response => {
            response.setEncoding('utf8');
            resolve(response);
        }).end();
    });
}
