'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const Rsync = require('rsync');

// API
const uploaderAPI = require('./src/handler/uploader');
const queueAPI = require('./src/handler/queue');
const videoAPI = require('./src/handler/video');

require('./src/utils/logger');

// BASE SETUP
// =============================================================================
const app = express();

// configure app to use bodyParser()
// this will let us get the data from a POST
const corsOptions = {
	origin: '*',
	optionsSuccessStatus: 200 // some legacy browsers (IE11, constious SmartTVs) choke on 204
};
// Enabling CORS Pre-Flight
app.options('*', cors(corsOptions));
app.use((0, cors)());
app.use(
	bodyParser.urlencoded({
		extended: true
	})
);
app.use(bodyParser.json());

const port = process.env.PORT || 8080; // set our port

// Rsync Server.
const rsync = new Rsync()
	.shell('ssh -p 2222')
	.archive()
	.compress()
	.progress()
	.delete()
	.exclude([ '.git', '.DS_Store' ])
	.source(path.resolve(process.cwd(), 'output'))
	.destination('rsync@localhost:/rsync');

global.rsync = rsync;

// signal handler function
const quitting = function() {
	if (rsync) {
		rsync.kill && rsync.kill();
	}
	process.exit();
};
process.on('SIGINT', quitting); // run signal handler on CTRL-C
process.on('SIGTERM', quitting); // run signal handler on SIGTERM
process.on('exit', quitting); // run signal handler when main process exits

// ROUTES FOR OUR API
// =============================================================================
const router = express.Router(); // get an instance of the express Router

router.post('/uploads', uploaderAPI.onUpload);
router.post('/queue/create_job', queueAPI.onCreateJob);
router.post('/queue/reload/:jobid', queueAPI.onReloadJob);

router.delete('/upload/:uuid', uploaderAPI.onDeleteFile);
router.delete('/video/:videoid', videoAPI.onDeleteVideo);
router.delete('/queue/:jobid', queueAPI.onRemoveJob);

router.get('/queue/overview', queueAPI.onJobOverview);
router.get('/queue/all/:jobstatus/:size', queueAPI.onGetJobs);
router.get('/queue/stats/:jobid', queueAPI.onQueryJobStats);
router.get('/video/play/:uuid', videoAPI.onGetVideo);

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
logger.info('Queue Server Working on port ' + port);
