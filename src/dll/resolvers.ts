import { User } from "./connectors";
import { paginateResults } from "../utils/pager";

export default {
  Query: {
    allUsers: async ({ pageSize = 20, after }) => {
      const users = await User.findAll();
      const pagedUsers = paginateResults({
        after,
        pageSize,
        results: users
      });
      return {
        users: pagedUsers,
        cursor: pagedUsers.length
          ? pagedUsers[pagedUsers.length - 1].cursor
          : null,
        hasMore: pagedUsers.length
          ? pagedUsers[pagedUsers.length - 1].cursor !==
            users[users.length - 1].cursor
          : false
      };
    }
  },
  Mutation: {}
};
