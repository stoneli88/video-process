"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const apollo_server_express_1 = require("apollo-server-express");
// API
const uploader_1 = require("./handler/uploader");
const queue_1 = require("./handler/queue");
const logger_1 = require("./utils/logger");
// gql
const schema_1 = require("./dll/schema");
const resolvers_1 = require("./dll/resolvers");
const jwtUtils_1 = require("./utils/jwtUtils");
// sequelize
const connectors_1 = require("./dll/connectors");
const constants_1 = require("./utils/constants");
// Apollo Setup
const gqlServer = new apollo_server_express_1.ApolloServer({
    typeDefs: schema_1.default,
    resolvers: resolvers_1.default,
    context: async ({ req }) => {
        try {
            const token = jwtUtils_1.getToken(req.headers.authorization);
            const { payload } = jwt.verify(token, constants_1.JWT_SECRET);
            if (!token) {
                throw new Error("You must be logged in");
            }
            if (payload.userId && payload.userPwd) {
                return { user: await jwtUtils_1.getUser(payload.userId, payload.userPwd) };
            }
            throw new Error("Payload is not valid.");
        }
        catch (err) {
            logger_1.logger.error(err);
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
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
const port = process.env.PORT || constants_1.SERVER_PORT; // set our port
// ROUTES FOR OUR API
// =============================================================================
const router = express.Router(); // get an instance of the express Router
router.post("/uploads", cors(corsOptions), uploader_1.onUpload);
router.post("/job/new", cors(corsOptions), queue_1.onCreateJob);
router.delete("/upload/:uuid", cors(corsOptions), uploader_1.onDeleteFile);
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use("/api/v1", router);
// START THE SERVER
// =============================================================================
(async () => {
    await connectors_1.sequelize.sync({ force: true });
    const server = app.listen({ port }, () => logger_1.logger.info(`🚀 GQL Server ready at http://localhost:${port}${gqlServer.graphqlPath}`));
    process.on("SIGTERM", shutDown);
    process.on("SIGINT", shutDown);
    function shutDown() {
        server.close(() => {
            logger_1.logger.info("Closed out remaining connections");
            process.exit(0);
        });
    }
})();
