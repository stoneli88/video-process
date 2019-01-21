import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as jwt from "jsonwebtoken";
import { ApolloServer } from "apollo-server-express";

// API
import { onUpload, onDeleteFile } from "./handler/uploader";
import { onCreateJob } from "./handler/queue";
import { logger } from "./utils/logger";

// gql
import typeDefs from "./dll/schema";
import resolvers from "./dll/resolvers";
import { getToken, getUser } from "./utils/jwtUtils";

// sequelize
import { sequelize } from "./dll/connectors";
import { SERVER_PORT, JWT_SECRET } from "./utils/constants";

interface IJWTPayload {
  payload: { userId: string; userPwd: string };
}

// Apollo Setup
const gqlServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    try {
      const token = getToken(req.headers.authorization);
      const { payload } = jwt.verify(token, JWT_SECRET) as IJWTPayload;

      if (!token) {
        throw new Error("You must be logged in");
      }

      if (payload.userId && payload.userPwd) {
        return { user: await getUser(payload.userId, payload.userPwd) };
      }

      throw new Error("Payload is not valid.");
    } catch (err) {
      logger.error(err);
      throw new Error("Server Error.");
    }
  }
});

// BASE SETUP
// =============================================================================
const app = express();

// apply apollo to express.
gqlServer.applyMiddleware({ app });

// Enabling CORS Pre-Flight
const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200 // some legacy browsers (IE11, constious SmartTVs) choke on 204
};
app.options("*", cors(corsOptions));

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(bodyParser.json());

const port = process.env.PORT || SERVER_PORT; // set our port

// ROUTES FOR OUR API
// =============================================================================
const router = express.Router(); // get an instance of the express Router

router.post("/uploads", cors(corsOptions), onUpload);
router.post("/job/new", cors(corsOptions), onCreateJob);
router.delete("/upload/:uuid", cors(corsOptions), onDeleteFile);

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use("/api/v1", router);

// START THE SERVER
// =============================================================================
(async () => {
  await sequelize.sync({ force: true });
  const server = app.listen({ port }, () =>
    logger.info(
      `🚀 GQL Server ready at http://localhost:${port}${gqlServer.graphqlPath}`
    )
  );
  process.on("SIGTERM", shutDown);
  process.on("SIGINT", shutDown);
  function shutDown() {
    server.close(() => {
      logger.info("Closed out remaining connections");
      process.exit(0);
    });
  }
})();
