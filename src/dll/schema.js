"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_express_1 = require("apollo-server-express");
const typeDefs = apollo_server_express_1.gql `
  type Query {
    users(filter: UserInput, cursor: String, limit: Int): UserFeed
    videos(filter: VideoInput, cursor: String, limit: Int): VideoFeed
  }
  type Mutation {
    addVideo(video: VideoInput): Video!
    addUser(user: UserInput): User!
    addCategory(category: CategoryInput): Category
  }
  type User {
    createdAt: String!
    updatedAt: String
    email: String!
    password: String!
    name: String!
    birthday: String
    videos: [Video]
    userId: String!
  }
  type Category {
    name: String!
    description: String
    cover: String
    categoryId: String!
  }
  type Video {
    videoId: String!
    name: String!
    description: String!
    channel: String
    duration: String
    framerate: String
    hd: Boolean
    keyword: String
    watched: String
    likes: String
    dislikes: String
    category: Category
    owner: User!
    isEncoded: String
    hlsUrl: String
    downloadUrl: String
    createdAt: String!
    updatedAt: String!
  }
  input CategoryInput {
    name: String!
    coverUuid: String!
    description: String
    categoryId: String!
  }
  input UserInput {
    userId: String
    name: String
    email: String
    password: String
  }
  input VideoInput {
    userId: String
    categoryId: String
    videoUuid: String
    coverUuid: String
    name: String
    description: String
    keyword: String
  }
  type VideoFeed {
    cursor: String!
    videos: [Video]!
  }
  type UserFeed {
    cursor: String!
    users: [User]!
  }
`;
exports.default = typeDefs;
