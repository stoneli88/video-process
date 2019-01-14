import { Column, Model, Table, Unique, PrimaryKey, CreatedAt, UpdatedAt, HasMany } from "sequelize-typescript";
import Video from "./Video";

@Table
class User extends Model<User> {
  @PrimaryKey
  @Column
  public userId!: string;

  @Column
  public name!: string;

  @Unique
  @Column
  public email!: string;

  @Column
  public birthday!: Date;

  @Column
  public password!: string;

  @HasMany(() => Video, "videoId")
  public Videos?: Video[];

  @CreatedAt
  @Column
  public createdAt!: Date;

  @UpdatedAt
  @Column
  public updatedAt!: Date;

}

export default User;