import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import { ApolloServer } from "apollo-server-express";

// API
import { onUpload, onDeleteFile } from "./handler/uploader";
import { onCreateJob } from "./handler/queue";
import { logger } from "./utils/logger";

// gql
import typeDefs from "./dll/schema";
import resolvers from "./dll/resolvers";

// sequelize
import { sequelize } from "./dll/connectors";

import { SERVER_PORT } from "./utils/constants";

// Apollo Setup
const gqlServer = new ApolloServer({ typeDefs, resolvers });

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
  await sequelize.sync({force: true});
  const server = app.listen({ port }, () =>
    logger.info(
      `🚀 Server ready at http://localhost:${port}${gqlServer.graphqlPath}`
    )
  );
  process.on('SIGTERM', shutDown);
  process.on('SIGINT', shutDown);
  function shutDown() {
    server.close(() => {
      logger.info('Closed out remaining connections');
      process.exit(0);
    });
  }
})();
