'use strict';

const path = require('path');
const { createJob, reloadJob, video_queue } = require('../service/queue');

// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, '__esModule', {
	value: true
});
// -------------------------------------------------

exports.onCreateJob = async (req, res) => {
	const { type, cover_name, cover_uuid, mov_name, mov_uuid, video_id } = req.body;
	const videoPath = path.resolve(process.cwd(), 'tmp', `tmp_video-${mov_uuid}`, mov_name);
	const coverPath = path.resolve(process.cwd(), 'tmp', `tmp_video-${cover_uuid}`, cover_name);
	try {
		const created = Date.now();
		switch (type) {
			case 'download':
				createJob(
					{
						cover_name,
						cover_uuid,
						mov_name,
						mov_uuid,
						videoPath,
						coverPath,
						videoID: video_id,
						jobType: 'DWN',
						created
					},
					onSuccess
				);
				break;
			case 'hls':
				createJob(
					{
						cover_name,
						cover_uuid,
						mov_name,
						mov_uuid,
						videoPath,
						coverPath,
						videoID: video_id,
						jobType: 'HLS',
						created
					},
					onSuccess
				);
				break;
			default:
				break;
		}
		function onSuccess(job) {
			res.send({
				success: true,
				jobId: job.videoID
			});
		}
	} catch (e) {
		logger.error('### [Bee-Queue] Create job error %s: \n', e);
		res.status(500).send({
			success: false,
			error: e
		});
	}
};

exports.onQueryJobStats = async (req, res) => {
	const { jobid } = req.params;

	if (jobid) {
		video_queue.getJob(jobid, (err, job) => {
			if (err) {
				logger.err(`#### [Bee-Queue] Process job error: ${err}`);
				res.status(500).send({
					success: false,
					error: err
				});
			}
			logger.info(`#### [Bee-Queue] Job ${jobid} has status ${job.status}`);
			res.send({
				success: true,
				data: job.status
			});
		});
	}
};

exports.onGetJobs = async (req, res) => {
	/**
 * Query all job by its state.
 * * All job types: "waiting, failed, succeeded, ative, or delayed"
 */
	let jobs = null;
	const { jobstatus, size } = req.params;

	try {
		logger.info(`#### [Bee-Queue]: Beging query QUEUE with stats: ${jobstatus}`);
		if (jobstatus === 'failed' || jobstatus === 'succeeded') {
			jobs = await video_queue.getJobs(jobstatus, { size });
		} else if (jobstatus === 'waiting' || jobstatus === 'active' || jobstatus === 'delayed') {
			jobs = await video_queue.getJobs(jobstatus, { start: 0, end: size });
		}
		res.send({
			status: true,
			jobs: jobs.map((job) => ({ id: job.id, data: job.data }))
		});
	} catch (err) {
		logger.error('#### [Bee-Queue]: Query queue stats found error: ' + err);
		res.status(500).send({
			status: false,
			error: err
		});
	}
};

exports.onRemoveJob = async (req, res) => {
	const { jobid } = req.params;
	video_queue.removeJob(jobid, (err) => {
		if (err) {
			logger.err(`#### [Bee-Queue] Remove job error: ${err}`);
			res.status(500).send({
				success: false,
				error: err
			});
		}
		res.status(200).send({
			success: true
		});
	});
};

exports.onReloadJob = async (req, res) => {
	const { jobid } = req.params;
	reloadJob(jobid, (hasError, ret) => {
		if (!hasError) {
			logger.error('#### [Bee-Queue]: Remove job error %s ', ret);
			res.status(500).send({
				status: false,
				error: ret
			});
		}
		res.send({
			status: true,
			data: {
				job: ret.id
			}
		});
	});
};

exports.onJobOverview = async (req, res) => {
	try {
		const counts = await video_queue.checkHealth();
		res.send({
			status: true,
			data: counts
		});
	} catch (error) {
		res.status(500).send({
			status: false,
			error: error
		});
	}
};
