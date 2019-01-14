import {
  Column,
  Model,
  Table,
  BelongsTo,
  ForeignKey,
  PrimaryKey,
  CreatedAt,
  UpdatedAt
} from "sequelize-typescript";
import User from "./User";

@Table
class Video extends Model<Video> {
  @PrimaryKey
  @Column
  public videoId!: string;

  @Column
  public name!: string;

  @Column
  public description!: string;

  @Column
  public channel!: string;

  @Column
  public duration!: string;

  @Column
  public framerate!: string;

  @Column
  public hd!: boolean;

  @Column
  public keyword!: string;

  @Column
  public watched!: string;

  @Column
  public likes!: string;

  @Column
  public dislikes!: string;

  @ForeignKey(() => User)
  @Column
  public userId!: string;

  @BelongsTo(() => User, "userId")
  public uploader!: User;

  @Column
  public hlsUrl!: string;

  @Column
  public downloadUrl!: string;

  @CreatedAt
  @Column
  public createdAt!: Date;

  @UpdatedAt
  @Column
  public updatedAt!: Date;
}

export default Video;
