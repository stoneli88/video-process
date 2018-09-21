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
exports.REDIS_SERVER_PORT = '6379';
exports.REDIS_SERVER_PWD = '';
exports.GRAPHQL_ENDPOINT = 'http://127.0.0.1:4000';
exports.VIDEO_SERVER = "127.0.0.1:9080/output";
exports.QUEUE_UI_PORT = 3030;
