import User from "../dll/models/User";
import { Sequelize } from "sequelize-typescript";

const Op = Sequelize.Op;

export const getToken = (authorizationHeader: string) => {
  const token = authorizationHeader || "";
  if (!token && token.split(" ")[0] !== "Bearer") {
    throw new Error("Invalid Authorization Header");
  }
  return token.split(" ")[1];
};

export const getUser = async (userId: string, userPwd: string) => {
  return User.findAll({
    where: {
      [Op.and]: [
        { userId: { [Op.eq]: [userId] } },
        { password: { [Op.eq]: [userPwd] } }
      ]
    }
  });
};
