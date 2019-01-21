import {
  Column,
  Model,
  Table,
  HasMany,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  Scopes
} from "sequelize-typescript";
import Video from "./Video";

@Scopes({
  allWithVideo: {
    include: [
      {
        model: () => Video,
        required: false,
        attributes: ["videoId", "name"]
      }
    ]
  }
})
@Table
class Category extends Model<Category> {
  public static scope(...args: any[]): typeof Category {
    args[0] = args[0] || "defaultScope";
    // @ts-ignore
    return super.scope.call(this, ...args);
  }

  @PrimaryKey
  @Column
  public categoryId!: string;

  @Column
  public name!: string;

  @Column
  public description!: string;

  @HasMany(() => Video)
  public videos?: Video[];

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

export default Category;
