"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = require("sqlite3");
const sequelize_typescript_1 = require("sequelize-typescript");
const User_1 = require("./models/User");
exports.User = User_1.default;
const Video_1 = require("./models/Video");
exports.Video = Video_1.default;
const Category_1 = require("./models/Category");
exports.Category = Category_1.default;
const logger_1 = require("../utils/logger");
const path = require("path");
// 初始化SQLLite.
const sqliteInstance = sqlite3_1.verbose();
const database = new sqliteInstance.Database(path.join(process.cwd(), "tmp", "sqlLiteData.db"), err => {
    if (err) {
        logger_1.logger.error(err.message);
    }
    logger_1.logger.info("🚀 Connected to the SQlite database.");
});
// 初始化Sequelize.
const sequelize = new sequelize_typescript_1.Sequelize({
    database: "pvideo",
    dialect: "sqlite",
    username: "root",
    password: "",
    storage: path.join(process.cwd(), "tmp", "sqlLiteData.db"),
    modelPaths: [__dirname + '/models']
});
exports.sequelize = sequelize;
process.on("SIGINT", () => {
    database.close(err => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Close the database connection.');
    });
});
