import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class ActivityLogModel extends Model<
  InferAttributes<ActivityLogModel>,
  InferCreationAttributes<ActivityLogModel>
> {
  declare id: CreationOptional<number>;
  declare actorUserId: number | null;
  declare actorRole: string | null;
  declare entityType: string;
  declare entityId: string | null;
  declare action: string;
  declare summary: string;
  declare metadata: Record<string, unknown> | null;
  declare sourceType: string;
  declare sourceReference: string | null;
  declare createdAt: CreationOptional<Date>;
}

export const initActivityLogModel = (
  sequelize: Sequelize
): typeof ActivityLogModel => {
  ActivityLogModel.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      actorUserId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: 'actor_user_id',
      },
      actorRole: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'actor_role',
      },
      entityType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'entity_type',
      },
      entityId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'entity_id',
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      sourceType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'source_type',
      },
      sourceReference: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'source_reference',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
    },
    {
      sequelize,
      tableName: 'activity_logs',
      modelName: 'ActivityLog',
      underscored: true,
      updatedAt: false,
    }
  );

  return ActivityLogModel;
};
