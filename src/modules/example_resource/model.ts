import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class ExampleResourceModel extends Model<
  InferAttributes<ExampleResourceModel>,
  InferCreationAttributes<ExampleResourceModel>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const initExampleResourceModel = (
  sequelize: Sequelize
): typeof ExampleResourceModel => {
  ExampleResourceModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: 'example_resources',
      modelName: 'ExampleResource',
      underscored: true,
    }
  );

  return ExampleResourceModel;
};
