import { User, Video } from "./connectors";
import { Sequelize } from "sequelize-typescript";
// Create Fake Data only for test.
// comments below code before you publish the project.
import {
  email as uEmail,
  password,
  seed,
  unix_time,
  username,
  uuid
} from "casual";
import { times } from "lodash";

seed(123);
(() => {
  setTimeout(() => {
    times(10, () => {
      User.create({
        userId: uuid,
        name: username,
        email: uEmail,
        password,
        birthday: unix_time
      });
    });
  }, 2000);
})();
// ----------------------------------------

const Op = Sequelize.Op;

export default {
  Query: {
    users: async (context, { filter, cursor, limit }) => {
      let where = {};
      if (filter) {
        const { userId, name, email } = filter;
        if (userId && !email && !name) { where = { userId: { [Op.like]: [`%${userId}%`] } }; }
        if (name && !email && !userId) { where = { name: { [Op.like]: [`%${name}%`] } }; }
        if (email && !name && !userId) { where = { email: { [Op.like]: [`%${email}%`] } }; }
        if (name && email && userId) { where = { [Op.and]: [{ name }, { email }, { userId }] }; }
      }
      const result = await User.scope("videos").findAndCountAll({ where });
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
        const { name, description, keyword, uploader } = filter;
        if (name) { condition.push({ email: { [Op.like]: [`%${description}`] } }); }
        if (description) { condition.push({ description: { [Op.like]: [`%${description}`] } }); }
        if (keyword) { condition.push({ keyword: { [Op.like]: [`%${keyword}`] } }); }
        if (uploader) { condition.push({ uploader: { [Op.like]: [`%${uploader}`] } }); }
        where = {[Op.or]: condition};
      }
      const result = await Video.scope("allWithUploader").findAndCountAll({ where });
      const { rows: videos, count } = result;
      if (count > limit) {
        if (!cursor) {
          cursor = videos[videos.length - 1].videoId;
        }
        const newVideoIndex = videos.findIndex(
          video => video.videoId === cursor
        );
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
    addVideo: async (context, { video }) => {
      const user = await User.findById(video.userId);
      if (!user) {
        throw new Error("User does not exists.");
      }
      const newVideo = await Video.create({
        videoId: uuid,
        name: video.name,
        description: video.description
      });
      return newVideo.$set("owner", user);
    }
  }
};
