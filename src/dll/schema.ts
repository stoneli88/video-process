import { gql } from "apollo-server-express";

const typeDefs = gql`
  type Query {
    users(filter: UserInput, cursor: String, limit: Int): UserFeed
    videos(filter: VideoInput, cursor: String, limit: Int): VideoFeed
  }
  type Mutation {
    addVideo(video: VideoInput): Video!
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
  input UserInput {
    userId: String
    name: String
    email: String
  }
  input VideoInput {
    userId: String
    mov_uuid: String
    cover_uuid: String
    mov_name: String
    cover_name: String
    name: String
    description: String
    category: String
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
  type Category {
    name: String!
    total_videos: String
    cover_url: String
    id: ID!
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
`;

export default typeDefs;
