// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, '__esModule', {
	value: true
});
// -------------------------------------------------
const path = require('path');

exports.FFMPEG_BIN = path.join('/', 'usr', 'local', 'bin', 'ffmpeg'); // mac
exports.FFPROBE_BIN = path.join('/', 'usr', 'local', 'bin', 'ffprobe'); //mac
exports.PRISMA_ENDPOINT = '127.0.0.1:4466';
exports.REDIS_SERVER = '127.0.0.1';
exports.VIDEO_SERVER = "localhost:9080/output";
