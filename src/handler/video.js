'use strict';

const fetch = require('node-fetch');
const { execute, makePromise } = require('apollo-link');
const { HttpLink } = require('apollo-link-http');
const gql = require('graphql-tag');
const CONFIG = require('../utils/config');

// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, '__esModule', {
	value: true
});
// -------------------------------------------------
// Use Apollo Link as a standalone client
const uri = CONFIG.GRAPHQL_ENDPOINT;
const link = new HttpLink({ uri, fetch });

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

const operation = {
	query: VIDEOS_QUERY,
	variables: {}
};

const onGetVideoPlayAddress = (exports.onGetVideoPlayAddress = async (req, res) => {
	const { uuid } = req.params;

	const { data } = await makePromise(execute(link, operation)).catch((error) => {
		res.status(500).send({
			success: false,
			error
		});
	});
	const { dynamicRes, manualRes } = data.videos[0];
	res.send({
		success: true,
		video: {
			cover: `${CONFIG.VIDEO_SERVER}/${uuid}/cover.png`,
			hls: dynamicRes,
			dwn: manualRes
		}
	});
});
