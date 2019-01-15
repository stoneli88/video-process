import {
  Column,
  Model,
  Table,
  Unique,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  HasMany,
  Scopes
} from "sequelize-typescript";
import Video from "./Video";

@Scopes({
  videos: {
    include: [
      {
        model: () => Video,
        required: true
      }
    ]
  }
})
@Table
class User extends Model<User> {
  public static scope(...args: any[]): typeof User {
    args[0] = args[0] || "defaultScope";
    // @ts-ignore
    return super.scope.call(this, ...args);
  }

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

  @HasMany(() => Video)
  public Videos?: Video[];

  @CreatedAt
  @Column
  public createdAt!: Date;

  @UpdatedAt
  @Column
  public updatedAt!: Date;
}

export default User;
