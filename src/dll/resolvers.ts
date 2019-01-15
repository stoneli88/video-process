import { User, Video } from "./connectors";
// Create Fake Data only for test.
// comments below code before you publish the project.
import { email, password, seed, unix_time, username, uuid } from "casual";
import { times } from "lodash";

seed(123);
(() => {
  setTimeout(() => {
    times(10, () => {
      User.create({
        userId: uuid,
        name: username,
        email,
        password,
        birthday: unix_time
      });
    });
  }, 2000);
})();
// ----------------------------------------

export default {
  Query: {
    users: async (context, { cursor, limit }) => {
      const result = await User.scope("videos").findAndCountAll();
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
      const result = await Video.findAndCountAll();
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
