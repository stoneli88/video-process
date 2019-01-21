"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = require("../dll/models/User");
const sequelize_typescript_1 = require("sequelize-typescript");
const Op = sequelize_typescript_1.Sequelize.Op;
exports.getToken = (authorizationHeader) => {
    const token = authorizationHeader || "";
    if (!token && token.split(" ")[0] !== "Bearer") {
        throw new Error("Invalid Authorization Header");
    }
    return token.split(" ")[1];
};
exports.getUser = async (userId, userPwd) => {
    return User_1.default.findAll({
        where: {
            [Op.and]: [
                { userId: { [Op.eq]: [userId] } },
                { password: { [Op.eq]: [userPwd] } }
            ]
        }
    });
};
