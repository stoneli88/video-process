"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const Queue_1 = require("../service/Queue");
const queue = Queue_1.default.getInstance("video-queue");
exports.onCreateJob = async (req, res) => {
    const { type, videoId, coverUploadId, coverUploadName, videoUploadName, videoUploadUuid } = req.body;
    const videoPath = path.resolve(process.cwd(), "tmp", `tmp_video-${videoUploadUuid}`, coverUploadName);
    const coverPath = path.resolve(process.cwd(), "tmp", `tmp_video-${coverUploadId}`, videoUploadName);
    const payload = {
        type,
        videoId,
        videoPath,
        coverPath,
        coverUploadId,
        coverUploadName,
        videoUploadName,
        videoUploadUuid,
        created: new Date().toString()
    };
    queue.createJob(payload).then((job) => {
        res.code(200).send();
    }).catch(() => {
        res.code(500).send();
    });
};
