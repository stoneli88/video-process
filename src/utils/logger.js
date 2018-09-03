const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, '__esModule', {
  value: true
});
// -------------------------------------------------

const myFormat = printf((info) => {
	return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

const logger = createLogger({
  levels: winston.config.syslog.levels,
	format: combine(label({ label: '[INFO]' }), timestamp(), myFormat),
	transports: [
		//
		// - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    // error: 0, 
    // warn: 1,
    // info: 2,
    // verbose: 3,
    // debug: 4,
    // silly: 5 
    //
    new transports.Console({ level: 'error' }),
    new transports.Console({ level: 'warn' }),
		new transports.File({ filename: 'error.log', level: 'error' }),
		new transports.File({ filename: 'combined.log' })
	]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
	logger.add(
		new winston.transports.Console({
			format: winston.format.simple()
		})
	);
}

exports.logger = logger;
