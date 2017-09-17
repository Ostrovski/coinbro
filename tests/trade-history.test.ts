import {Readable} from 'stream';
import * as test from 'tape';
import {Period} from '../src/times';
import TradeHistory from '../src/TradeHistory';


function createFetchFn(records: Array<{[key in string]: any}>) {
    return (_currencyPair: string, period: Period): Promise<Readable> => {
        let done = false;

        return Promise.resolve(new Readable({
            read() {
                if (done) {
                    this.push(null);
                    return;
                }

                console.log(`fetch.period ${new Date(period.start).toISOString()}..${new Date(period.end).toISOString()}`);
                const chunk = records.filter(r => {
                    const createdAt = +new Date(r.date + ' +00');
                    return (period.start <= createdAt && createdAt <= period.end);
                });

                setTimeout(() => {
                    console.log('fetch.push', chunk);
                    this.push(JSON.stringify(chunk));
                    done = true;
                }, 6000);
            }
        }));
    }
}

test('reading test', (assert) => {
    const reader = new TradeHistory(
        'btc_eth',
        +new Date('2016-01-01'),
        +new Date('2018-01-01'),
        0,
        createFetchFn(require('../../tests/fixtures/sparse.json')),
    );

    reader.on('error', err => {
        assert.end(err);
    });

    const history: string[] = [];
    reader.on('data', (datum: string) => {
        history.push(datum);
    });

    reader.on('end', () => {
        assert.equal(history.length, 5);
        assert.end();
    });
});
