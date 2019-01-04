import { STRING, BOOLEAN, DATE, NUMBER } from "sequelize";
import { name, email, password, date } from "casual";
import { times } from "lodash";

const db = new Sequelize("vking", null, null, {
  dialect: "sqlite",
  storage: "./vking.sqlite"
});

const VideoModel = db.define("video", {
  name: { type: STRING },
  description: { type: STRING },
  channel: { type: STRING },
  duration: { type: STRING },
  framerate: { type: STRING },
  hd: { type: BOOLEAN },
  keyword: { type: STRING },
  views: { type: NUMBER },
  likes: { type: STRING },
  dislikes: { type: STRING },
  category: { type: STRING },
  owner: { type: STRING },
  isEncoded: { type: STRING },
  hlsUrl: { type: STRING },
  downloadUrl: { type: STRING },
  createdAt: { type: DATE },
  updatedAt: { type: DATE }
});

const UserModel = db.define("user", {
  created: { type: STRING },
  edited: { type: STRING },
  email: { type: STRING },
  password: { type: STRING },
  name: { type: STRING },
  birthYear: { type: DATE }
});

UserModel.hasMany(VideoModel);

// create mock data with a seed, so we always get the same
casual.seed(123);
db.sync({ force: true }).then(() => {
  times(10, () => {
    return UserModel.create({
      name: casual.name,
      email: casual.email,
      password: casual.password,
      birthYear: casual.date,
      created: casual.date,
      edited: casual.date
    });
  });
});

const User = db.models.user;
const Video = db.models.video;

export { User, Video };