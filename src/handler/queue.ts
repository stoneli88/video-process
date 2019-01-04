import * as path from "path";
import Queue from "../service/Queue";

const queue = Queue.getInstance("video-queue");

export const onCreateJob = async (req, res) => {
  const {
    type,
    videoId,
    coverUploadId,
    coverUploadName,
    videoUploadName,
    videoUploadUuid
  } = req.body;
  const videoPath = path.resolve(
    process.cwd(),
    "tmp",
    `tmp_video-${videoUploadUuid}`,
    coverUploadName
  );
  const coverPath = path.resolve(
    process.cwd(),
    "tmp",
    `tmp_video-${coverUploadId}`,
    videoUploadName
  );
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
