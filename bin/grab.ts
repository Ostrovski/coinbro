import { createWriteStream } from 'fs';
import * as moment from 'moment-timezone';
import * as request from 'request';
import TradeHistory from '../src/grabbers/TradeHistory';

const pair = process.argv[2].toUpperCase();
const start = moment(process.argv[3]);
const end = moment(process.argv[4]) || moment.utc();

console.log(`grab pair=${pair} start=${start.toISOString()} end=${end.toISOString()}`);

(request as any).debug = true;

const reader = new TradeHistory(pair, start.toISOString(), end.toISOString());
reader.on('error', (err) => {
    console.log('on.error', err);
});
reader.on('chunk', (stat) => {
    console.log('on.chunk', stat);
});
reader.on('end', () => {
    console.log('on.end: finita la comedia');
    setTimeout(() => {}, 2500);
});

reader.pipe(createWriteStream(`out_${start.unix()}-${end.unix()}.json`));
//reader.pipe(process.stdout);
