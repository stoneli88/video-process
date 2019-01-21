"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var Video_1;
"use strict";
const sequelize_typescript_1 = require("sequelize-typescript");
const User_1 = require("./User");
const Category_1 = require("./Category");
let Video = Video_1 = class Video extends sequelize_typescript_1.Model {
    static scope(...args) {
        args[0] = args[0] || "defaultScope";
        // @ts-ignore
        return super.scope.call(this, ...args);
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "videoId", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "name", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "description", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "channel", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "duration", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "framerate", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], Video.prototype, "hd", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "keyword", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "watched", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "likes", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "dislikes", void 0);
__decorate([
    sequelize_typescript_1.ForeignKey(() => User_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "userId", void 0);
__decorate([
    sequelize_typescript_1.BelongsTo(() => User_1.default),
    __metadata("design:type", User_1.default)
], Video.prototype, "owner", void 0);
__decorate([
    sequelize_typescript_1.ForeignKey(() => Category_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "categoryId", void 0);
__decorate([
    sequelize_typescript_1.BelongsTo(() => Category_1.default),
    __metadata("design:type", Category_1.default)
], Video.prototype, "category", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "hlsUrl", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Video.prototype, "downloadUrl", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    sequelize_typescript_1.Column,
    __metadata("design:type", Date)
], Video.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    sequelize_typescript_1.Column,
    __metadata("design:type", Date)
], Video.prototype, "updatedAt", void 0);
Video = Video_1 = __decorate([
    sequelize_typescript_1.Scopes({
        allWithUploader: {
            include: [
                {
                    model: () => User_1.default,
                    required: false,
                    attributes: ["userId", "name"]
                }
            ]
        }
    }),
    sequelize_typescript_1.Table
], Video);
exports.default = Video;
