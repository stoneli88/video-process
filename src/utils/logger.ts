import { createLogger, format, transports, config } from "winston";
const { combine, timestamp, printf, prettyPrint } = format;

const myFormat = printf(info => {
  return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

export const logger = createLogger({
  levels: config.syslog.levels,
  format: combine(timestamp(), myFormat, prettyPrint()),
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
    new transports.Console({ level: "error" }),
    new transports.Console({ level: "warn" }),
    new transports.File({ filename: "./log/error.log", level: "error" }),
    new transports.File({ filename: "./log/combined.log" })
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.simple()
    })
  );
}
