'use strict';

const fetch = require('node-fetch');
const {execute, makePromise} = require('apollo-link');
const {HttpLink} = require('apollo-link-http');
const gql = require('graphql-tag');
const del = require('del');

const CONFIG = require('../utils/config');

// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, '__esModule', {
  value: true
});
// -------------------------------------------------
// Use Apollo Link as a standalone client
const uri = CONFIG.GRAPHQL_ENDPOINT;
const link = new HttpLink({uri, fetch});

const VIDEOS_QUERY = gql`
	query VideoQuery($filter: String, $first: Int, $skip: Int, $orderBy: VideoOrderByInput) {
		videos(filter: $filter, first: $first, skip: $skip, orderBy: $orderBy) {
			id
			mov_uuid
			cover_uuid
			mov_name
			cover_name
			name
			description
			category {
				id
				name
			}
			owner {
				name
			}
			viewnumber
			likes
			dislikes
			dynamicRes
			manualRes
			createdAt
		}
	}
`;

const REMOVE_VIDEO = gql`
	mutation RemoveVideo($id: String!) {
		removeVideo(id: $id) {
			id
		}
	}
`;

const operation = {
  query: VIDEOS_QUERY,
  variables: {}
};

const getVideoById = async (videoId, response) => {
  operation.variables = {
    filter: JSON.stringify({
      id: videoId
    })
  };

  const {data} = await makePromise(execute(link, operation)).catch((error) => {
    response.status(500).send({
      success: false,
      error
    });
  });

  return data.videos[0];
};

const getVideos = async ({videoParams, response}) => {
  if (videoParams) {
    operation.variables = {
      filter: JSON.stringify(videoParams)
    };
  }
  const {data} = await makePromise(execute(link, operation)).catch((error) => {
    response.status(500).send({
      success: false,
      error
    });
  });
  return data.videos;
};

exports.onGetVideos = async (req, res) => {
  const videos = await getVideos({response: res, videoParams: undefined});

  res.send({
    success: true,
    videos: videos.map(video => ({
      id: video.id,
      cover: `${CONFIG.VIDEO_SERVER}/${video.cover_uuid}/cover.png`,
      name: video.name,
      description: video.description,
      category: video.category,
      playUrl: video.dynamicRes,
      downloadUrl: video.manualRes
    }))
  });
};

exports.onGetVideo = async (req, res) => {
  const {uuid} = req.params;
  const {dynamicRes, manualRes} = await getVideoById(uuid, res);
  res.send({
    success: true,
    video: {
      cover: `${CONFIG.VIDEO_SERVER}/${uuid}/cover.png`,
      hls: dynamicRes,
      dwn: manualRes
    }
  });
};

exports.onDeleteVideo = async (req, res) => {
  const {videoid} = req.params;
  const {cover_uuid, mov_uuid, id} = await getVideoById(videoid);

  // delete tmp diretory
  // delete output diretory
  const files = [
    `${process.cwd()}/tmp/tmp_video-${mov_uuid}/**`,
    `${process.cwd()}/tmp/tmp_video-${cover_uuid}/**`,
    `${process.cwd()}/output/${id}/**`
  ];
  // delete database
  operation.query = REMOVE_VIDEO;
  operation.variables = {id};

  logger.info(`#### [DEL] Start delete files of ${mov_uuid}.`);

  del(files).then((paths) => {
    logger.info(`#### [DEL] Delete files of ${mov_uuid} successfully.`);
    global.rsync.execute((error, code, cmd) => {
      if (error) {
        logger.error(`#### [RSYNC] Error when execute: ${error}`);
      }
      logger.info(`#### [RSYNC] Sync successfully done.`);
      makePromise(execute(link, operation))
        .then(() => {
          res.status(200).send({
            success: true
          });
        })
        .catch((error) => {
          console.log(error);
          res.status(500).send({
            success: false,
            error
          });
        });
    });
  });
};
