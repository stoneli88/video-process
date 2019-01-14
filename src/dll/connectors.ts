import { verbose, sqlite3, Database } from "sqlite3";
import { Sequelize } from "sequelize-typescript";
import User from "./models/User";
import Video from "./models/Video";
import { logger } from "../utils/logger";

// 初始化SQLLite.
const sqliteInstance: sqlite3 = verbose();
const database: Database = new sqliteInstance.Database(":memory:", err => {
  if (err) {
    logger.error(err.message);
  }
  logger.info("🚀 Connected to the in-memory SQlite database.");
});

// 初始化Sequelize.
const sequelize = new Sequelize({
  database: "pvideo",
  dialect: "sqlite",
  username: "root",
  password: "",
  storage: ":memory:",
  modelPaths: [__dirname + '/models']
});

process.on("SIGINT", () => {
  database.close(err => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Close the database connection.');
  });
});

export { sequelize, User, Video };
