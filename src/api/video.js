'use strict';

const path = require('path');
const CONFIG = require('../utils/config');
const { spawn } = require('child_process');
const { video_queue } = require('../api/queue');

// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, '__esModule', {
	value: true
});
// -------------------------------------------------

const onGetVideoPlayAddress = (exports.onGetVideoPlayAddress = async (req, res) => {
	const { uuid } = req.params;

	video_queue.getJob(uuid, (err, job) => {
		if (err) {
			console.log(`#### [Bee-Queue] Query job status error: ${err}`);
			res.status(500).send({
				success: false,
				error: err
			});
		}
		if (job.status === 'succeeded') {
			const name = job.data.video_name;
			const size = job.data.video_size;
			const mp4info = spawn(`${process.cwd()}/bin/mp4info`, [
				`${process.cwd()}/output/${uuid}/${name}_${size}.mp4`
			]);
			const grep = spawn('grep', [ 'Codec' ]);
			mp4info.stderr.on('data', (data) => {
				console.log(`#### [MP4INFO] Error when get video info: ${data}`);
				res.status(500).send({
					success: false,
					error: data
				});
			});
			grep.stdout.on('data', (data) => {
				res.send({
					success: true,
					video: {
						url: `${CONFIG.VIDEO_SERVER}/${uuid}/${name}_${size}_dashinit.mp4`,
						xml: `${CONFIG.VIDEO_SERVER}/${uuid}/${name}_${size}.xml`,
						mp4info: data
							.toString()
							.replace(/:|Codecs|String|\r|\n/g, '')
							.replace(/\s+/g, ', ')
							.replace(/\r|\n/g, '')
							.replace(/^,/g, '')
					}
				});
			});
			grep.stderr.on('data', (data) => {
				console.log(`#### [MP4INFO] Error when {grep} video info: ${data}`);
				res.status(500).send({
					success: false,
					error: data
				});
			});
			// execute shell command.
			mp4info.stdout.pipe(grep.stdin);
		}
	});
});
