'use strict';

// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, '__esModule', {
	value: true
});
// -------------------------------------------------

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const cpFile = require('cp-file');
const PATH = require('../utils/config');
const mkdirp = require('mkdirp');
const { execFile, exec } = require('child_process');
const log = require('single-line-log').stdout;

/**
 * 480x270 @ 350 kbps video with 128 kbps audio (bits/pixel: 0.113)
 * 640x360 @ 650 kbps video with 128 kbps audio (bits/pixel: 0.118)
 * 960x540 @ 1400 kbps video with 128 kbps audio (bits/pixel: 0.112)
 * 1280x720 @ 2500 kbps video with 128 kbps audio (bits/pixel: 0.113)
 * 1920x1080 @ 5500 kbps video with 128 kbps audio (bits/pixel: 0.111)
 * 2560x1440 @ 10000 kbps video with 128 kbps audio (bits/pixel: 0.113)
 * 3840x2160 @ 22000 kbps video with 128 kbps audio (bits/pixel: 0.111)
 */
const videoBitrateMapper = {
	'360': '650',
	'480': '1400',
	'720': '2500',
	'1080': '5500'
};

const videoSizeMapper = {
	'360': '640x360',
	'480': '854x480',
	'720': '1280x720',
	'1080': '1920x1080'
};

const ensureExists = (path, mask, cb) => {
	if (typeof mask == 'function') {
		// allow the `mask` parameter to be optional
		cb = mask;
		mask = '0777';
	}
	fs.mkdir(path, mask, function(err) {
		if (err) {
			if (err.code == 'EEXIST')
				cb(null); // ignore the error if the folder already exists
			else cb(err); // something else went wrong
		} else cb(null); // successfully created folder
	});
};

// OUTPUT DIR
const OUTPUT_DIR = 'output';
// Set ffmpeg path.
ffmpeg.setFfmpegPath(PATH.FFMPEG_BIN);
ffmpeg.setFfprobePath(PATH.FFPROBE_BIN);

// Reading video metadata.
const getVideoMetadata = (exports.getVideoMetadata = (videoPath) => {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(path.resolve(videoPath), function(err, metadata) {
			if (!err) {
				resolve({
					video: metadata['streams'][0],
					audio: metadata['streams'][1]
				});
			} else {
				reject({ err });
			}
		});
	});
});

// Make 10 Screenshot.
const makeScreenshot = (exports.makeScreenShot = (task) => {
	const startTime = Date.now();
	const videoPath = task.data.video_path;
	const outputName = task.data.video_name;
	const videoId = task.data.video_id;
	return new Promise((resolve, reject) => {
		ffmpeg(videoPath)
			.screenshots({
				count: 10,
				folder: `${process.cwd()}/${OUTPUT_DIR}/${videoId}/${outputName}`
			})
			.on('start', function(commandLine) {
				console.log('#### [FFMPEG]: Start to make screenshoot.');
			})
			.on('end', () => {
				const endTime = Date.now();
				console.log(`#### [FFMPEG] screenshot completed after ${(endTime - startTime) / 1000} seconds`);
				resolve({
					encode_duration: (endTime - startTime) / 1000,
					endTime
				});
			})
			.on('error', function(err) {
				console.log('#### ffmpeg screenshot error: ' + err);
				reject({
					err
				});
			});
	});
});

// Encode video to mp4 format.
const createDownloadableVideo = (exports.createDownloadableVideo = (task) => {
	let sizes = [];
	const startTime = Date.now();
	const videoId = task.data.video_dbid;
	const videoPath = task.data.videoPath;
	const outputName = task.data.mov_name;
	const outputDIR = `${process.cwd()}/${OUTPUT_DIR}/${videoId}`;
	const x264Command = [
		'-preset fast',
		'-movflags +faststart',
		'-r 24',
		'-profile:v main',
		'-x264opts keyint=48:min-keyint=48:no-scenecut',
		'-c:a aac',
		'-b:a 128k',
		'-ac 2'
	];
	return new Promise((resolve, reject) => {
		getVideoMetadata(videoPath)
			.then(async (mp4info) => {
				let result = null;
				const videoHeight = parseInt(mp4info.video.height, 10);
				if (videoHeight <= 360) {
					result = await processBySize(360, reject);
				} else if (videoHeight <= 480 && videoHeight > 360) {
					result = await Promise.all([ processBySize(360, reject), processBySize(480, reject) ]);
				} else if (videoHeight <= 720 && videoHeight > 480) {
					result = await Promise.all([
						processBySize(360, reject),
						processBySize(480, reject),
						processBySize(720, reject)
					]);
				} else if ((videoHeight <= 1080 && videoHeight > 720) || videoHeight > 1080) {
					result = await Promise.all([
						processBySize(360, reject),
						processBySize(480, reject),
						processBySize(720, reject),
						processBySize(1080, reject)
					]);
				}
				// result && makeScreenshot(task, resolve, reject, sizes);
				if (result) {
					const endTime = Date.now();
					console.log(
						`#### [FFMPEG] Create Downloadable Video completed after ${(endTime - startTime) /
							1000} seconds`
					);
					resolve({
						encode_duration: (endTime - startTime) / 1000,
						endTime
					});
				}
			})
			.catch((e) => {
				console.log('#### [FFPROBE] Get Video metedata Error: /n');
				console.log(e);
				reject(e);
			});
	});

	async function processBySize(size, reject) {
		try {
			const parameter = {
				videoBitrate: 0,
				videoSize: '',
				videoPath,
				videoId,
				outputName
			};
			parameter.videoSize = videoSizeMapper[size];
			parameter.videoBitrate = videoBitrateMapper[size];
			sizes.push(videoSizeMapper[size]);
			return await _encode(parameter);
		} catch (error) {
			reject(error);
		}
	}

	async function _encode(parameter) {
		const { videoPath, videoSize, videoBitrate, videoId, outputName } = parameter;
		return new Promise((resolve, reject) => {
			ensureExists(outputDIR, '0744', function(err) {
				const startTime = Date.now();
				if (err) console.log('#### [NODEJS] Create directory failed, ' + err);
				ffmpeg(videoPath)
					.videoBitrate(videoBitrate)
					.videoCodec('libx264')
					.addOutputOption(x264Command)
					.size(videoSize)
					.output(`${process.cwd()}/${OUTPUT_DIR}/${videoId}/${outputName}_${videoSize}.mp4`)
					.on('progress', function(progress) {
						task.reportProgress(progress.percent);
					})
					.on('start', function(commandLine) {
						console.log(`#### [FFMPEG]: Start to encode video with size: ${videoSize} ...`);
					})
					.on('end', function() {
						const endTime = Date.now();
						console.log(
							`#### [FFMPEG] Size ${videoSize} encode completed after ${(endTime - startTime) /
								1000} seconds`
						);
						resolve({
							encode_duration: (endTime - startTime) / 1000,
							endTime
						});
					})
					.on('error', function(err) {
						console.log(`### [FFMPEG] Size ${videoSize} ffmpeg error: ` + err);
						reject({ err });
					})
					.run();
			});
		});
	}
});

// https://gist.github.com/mrbar42/ae111731906f958b396f30906004b3fa
const createVODByHLS = (exports.createVODByHLS = (task) => {
	let startTime = null;
	return new Promise((resolve, reject) => {
		const videoId = task.data.video_dbid;
		const outputDIR = `${process.cwd()}/${OUTPUT_DIR}/${videoId}`;
		exec(`chmod +x ${process.cwd()}/bin/create-vod-hls.sh`, (error, stdout, stderr) => {
			startTime = Date.now();
			if (error) {
				reject(error);
				return;
			}
			log('#### [FFMPEG-HLS] Create directory complete.\n');
			mkdirp(outputDIR, async function(err) {
				if (err) {
					reject(error);
					return;
				}
				await cpFile(task.data.coverPath, `${outputDIR}/cover.png`);
				log('#### [FFMPEG-HLS] Copy image file complete.\n');
				execFile(
					`${process.cwd()}/bin/create-vod-hls.sh`,
					[ task.data.videoPath, outputDIR ],
					(error, stdout, stderr) => {
						if (error) {
							reject(error);
							return;
						}
						const endTime = Date.now();
						console.log('#### [FFMPEG-HLS] HLS Vod playlist is successfully completed.');
						resolve({
							encode_duration: (endTime - startTime) / 1000,
							endTime
						});
					}
				);
			});
		});
	});
});
