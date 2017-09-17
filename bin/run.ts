import {createWriteStream} from 'fs';
import {createReadStream as createHistoryReader} from '../src';

function usage(err: string = '') {
    if (err) {
        console.log(err);
        console.log();
    }
    console.log('USAGE: poloniex-trade-history [-f <file>] <currency_pair> <start> [end]');
}

const args = process.argv.slice(2);
const flagIdx = args.indexOf('-f');
let filename = '';
if (flagIdx !== -1) {
    filename = args[flagIdx + 1];
    if (!filename) {
        usage('Path to file should be specified after -f option');
        process.exit(-1);
    }
    args.splice(flagIdx, 2);
}

const pair = args[0].toUpperCase();
const start = +new Date(args[1]);
const end = +new Date(args[2]);

const reader = createHistoryReader(pair, start, end);
reader.on('error', (err) => {
    process.stderr.write(`Error: ${err}`);
});

if (filename) {
    reader
        .on('chunk', chunk => console.log('fetched', chunk))
        .pipe(createWriteStream(filename))
        .on('finish', () => console.log('done!'));
} else {
    reader.pipe(process.stdout);
}
