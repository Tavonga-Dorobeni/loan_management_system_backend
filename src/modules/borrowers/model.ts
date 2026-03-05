import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class BorrowerModel extends Model<
  InferAttributes<BorrowerModel>,
  InferCreationAttributes<BorrowerModel>
> {
  declare id: CreationOptional<number>;
  declare firstName: string;
  declare lastName: string;
  declare idNumber: string;
  declare phoneNumber: string | null;
  declare email: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const initBorrowerModel = (sequelize: Sequelize): typeof BorrowerModel => {
  BorrowerModel.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'first_name',
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'last_name',
      },
      idNumber: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'id_number',
      },
      phoneNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'phone_number',
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: 'borrowers',
      modelName: 'Borrower',
      underscored: true,
    }
  );

  return BorrowerModel;
};
