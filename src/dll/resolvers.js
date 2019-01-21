"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connectors_1 = require("./connectors");
const sequelize_typescript_1 = require("sequelize-typescript");
const casual_1 = require("casual");
const Op = sequelize_typescript_1.Sequelize.Op;
exports.default = {
    Query: {
        users: async (context, { filter, cursor, limit }) => {
            let where = {};
            if (filter) {
                const { userId, name, email } = filter;
                if (userId && !email && !name) {
                    where = { userId: { [Op.like]: [`%${userId}%`] } };
                }
                if (name && !email && !userId) {
                    where = { name: { [Op.like]: [`%${name}%`] } };
                }
                if (email && !name && !userId) {
                    where = { email: { [Op.like]: [`%${email}%`] } };
                }
                if (name && email && userId) {
                    where = { [Op.and]: [{ name }, { email }, { userId }] };
                }
            }
            const result = await connectors_1.User.scope("videos").findAndCountAll({
                where
            });
            const { rows: users, count } = result;
            if (count > limit) {
                if (!cursor) {
                    cursor = users[users.length - 1].userId;
                }
                const newUserIndex = users.findIndex(user => user.userId === cursor);
                const newCursor = users[newUserIndex - limit].userId;
                return {
                    users: users.slice(newUserIndex - limit, newUserIndex),
                    cursor: newCursor
                };
            }
            return {
                users,
                cursor: ""
            };
        },
        videos: async (context, { filter, cursor, limit }) => {
            let where = {};
            const condition = [{}];
            if (filter) {
                const { name, description, keyword, userId } = filter;
                if (name) {
                    condition.push({ name: { [Op.like]: [`%${name}`] } });
                }
                if (description) {
                    condition.push({ description: { [Op.like]: [`%${description}`] } });
                }
                if (keyword) {
                    condition.push({ keyword: { [Op.like]: [`%${keyword}`] } });
                }
                if (userId) {
                    condition.push({ userId: { [Op.like]: [`%${userId}`] } });
                }
                where = { [Op.or]: condition };
            }
            const result = await connectors_1.Video.scope("allWithUploader").findAndCountAll({ where });
            const { rows: videos, count } = result;
            if (count > limit) {
                if (!cursor) {
                    cursor = videos[videos.length - 1].videoId;
                }
                const newVideoIndex = videos.findIndex(video => video.videoId === cursor);
                const newCursor = videos[newVideoIndex - limit].videoId;
                return {
                    videos: videos.slice(newVideoIndex - limit, newVideoIndex),
                    cursor: newCursor
                };
            }
            return {
                videos,
                cursor: ""
            };
        }
    },
    Mutation: {
        addUser: (context, { user }) => {
            const { userId, name, email, password } = user;
            return connectors_1.User.create({
                userId: userId ? userId : casual_1.uuid,
                name,
                email,
                password
            });
        },
        addCategory: (context, { category }) => {
            return connectors_1.Category.create({
                name: category.name,
                description: category.description,
                categoryId: category.categoryId
            });
        },
        addVideo: async (context, { video }) => {
            const user = await connectors_1.User.findById(video.userId);
            const category = await connectors_1.Category.findById(video.categoryId);
            if (!user) {
                throw new Error("User does not exists.");
            }
            if (!category) {
                throw new Error("Category does not exists.");
            }
            const newVideo = await connectors_1.Video.create({
                videoId: video.id ? video.id : "",
                name: video.name ? video.name : "",
                description: video.description ? video.description : "",
                keyword: video.keyword ? video.keyword : ""
            });
            newVideo.$set("owner", user);
            newVideo.$set("category", category);
            return newVideo;
        }
    }
};
