import { User, Video, Category } from "./connectors";
import { Sequelize } from "sequelize-typescript";
import { uuid } from "casual";

const Op = Sequelize.Op;

export default {
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
      const result = await User.scope("videos").findAndCountAll<User>({
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
      const result = await Video.scope("allWithUploader").findAndCountAll<
        Video
      >({ where });
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
    addUser: (context, { user }) => {
      const { userId, name, email, password } = user;
      return User.create({
        userId: userId ? userId : uuid,
        name,
        email,
        password
      });
    },
    addCategory: (context, { category }) => {
      return Category.create({
        name: category.name,
        description: category.description,
        categoryId: category.categoryId
      });
    },
    addVideo: async (context, { video }) => {
      const user = await User.findById(video.userId);
      const category = await Category.findById(video.categoryId);
      if (!user) {
        throw new Error("User does not exists.");
      }
      if (!category) {
        throw new Error("Category does not exists.");
      }
      const newVideo = await Video.create({
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
