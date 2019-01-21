"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const { combine, timestamp, printf, prettyPrint } = winston_1.format;
const myFormat = printf(info => {
    return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});
exports.logger = winston_1.createLogger({
    levels: winston_1.config.syslog.levels,
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
        new winston_1.transports.Console({ level: "error" }),
        new winston_1.transports.Console({ level: "warn" }),
        new winston_1.transports.File({ filename: "./log/error.log", level: "error" }),
        new winston_1.transports.File({ filename: "./log/combined.log" })
    ]
});
//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
    exports.logger.add(new winston_1.transports.Console({
        format: winston_1.format.simple()
    }));
}
