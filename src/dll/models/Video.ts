import {
  Column,
  Model,
  Table,
  BelongsTo,
  ForeignKey,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  Scopes
} from "sequelize-typescript";
import User from "./User";

@Scopes({
  uploader: {
    include: [
      {
        model: () => User,
        through: { attributes: [] }
      }
    ]
  }
})
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

  @BelongsTo(() => User)
  public owner!: User;

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
