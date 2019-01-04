import { gql } from "apollo-server-express";

const typeDefs = gql`
  type Query {
#    allVideos(pageSize: Int, after: String): AllVideos!
    allUsers(pageSize: Int, after: String): AllUsers!
  }
  type Mutation {
    addVideo(
      mov_uuid: String!
      cover_uuid: String!
      mov_name: String!
      cover_name: String!
      name: String
      description: String
      category: String
      keyword: String
    ): Video!
  }
  type AllVideos {
    cursor: String!
    hasMore: Boolean!
    videos: [Video]!
  }
  type AllUsers {
    cursor: String!
    hasMore: Boolean!
    users: [User]!
  }
  type Category {
    name: String!
    total_videos: String
    cover_url: String
    id: ID!
  }
  type User {
    created: String!
    edited: String
    email: String!
    password: String!
    name: String!
    birthYear: String
    videos: [Video]
    id: ID!
  }
  type VideoUploadedDetails {
    mov_uuid: String!
    cover_uuid: String!
    mov_name: String!
    cover_name: String!
    mov_url: String!
    cover_url: String!
  }
  type Video {
    id: ID!
    name: String!
    description: String!
    channel: String
    duration: String
    framerate: String
    hd: Boolean
    keyword: String
    viewnumber: String
    likes: String
    dislikes: String
    category: Category!
    owner: User!
    isEncoded: String
    uploadDetails: VideoUploadedDetails!
    hlsUrl: String
    downloadUrl: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }
`;

export default typeDefs;
