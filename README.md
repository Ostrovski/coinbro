# Poloniex Trade History reader/grabber

## Usage

### As command line tool
Dump trade history for given currency pair & time interval to screen (order by time desc)
```
poloniex-trade-history <currency_pair> <start> [end]
```

Grab trade history for given currency pair & time interval to file (order by time asc)
```
poloniex-trade-history -f </path/to/file.json> <currency_pair> <start> [end]
```

Examples:
```
poloniex-trade-history btc_eth 2017-01-01T00:00:00 2017-01-14T00:00:00
poloniex-trade-history -f btc_xrp 2017-09-01T00:00:00
```

### As node module
Instances of `TradeHistory` class are [readable streams](https://nodejs.org/docs/latest/api/stream.html#stream_readable_streams).

```
const { createReadStream } = require('poloniex-trade-history');

const pair = 'btc_eth';
const start = '2017-01-01T00:00:00';
const end = '2017-02-01T00:00:00';

const reader = createReadStream(pair, start, end);
reader.on('error', err => console.log('on.error', err));

reader.pipe(<your_writable_stream>);
// ...or
reader.on('data', data => console.log('on.data', data));
```

### Tests
```
npm test
```
