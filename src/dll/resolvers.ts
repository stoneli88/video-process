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
      const result = await User.findAndCountAll();
      const { rows: users } = result;
      if (!cursor) {
        cursor = users[users.length - 1].userId;
      }
      const newUserIndex = users.findIndex(user => user.userId === cursor);
      const newCursor = users[newUserIndex - limit].userId;

      return {
        users: users.slice(newUserIndex - limit, newUserIndex),
        cursor: newCursor
      };
    },
    videos: async (context, { filter, cursir, limit }) => {
      const result = await Video.findAndCount({});
      return {
        videos: [],
        cursor: ""
      }
    }
  },
  Mutation: {
    addVideo: async (context, { video }) => {
      const user = await User.findById(video.userId);
      if(!user) {
        throw new Error("User does not exists.");
      }
      return Video.create({
        videoId: uuid,
        owner: video.userId,
        name: video.name,
        description: video.description,
      });
    }
  }
};
