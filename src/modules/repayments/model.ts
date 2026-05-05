import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class RepaymentModel extends Model<
  InferAttributes<RepaymentModel>,
  InferCreationAttributes<RepaymentModel>
> {
  declare id: CreationOptional<number>;
  declare loanId: number;
  declare amount: number;
  declare transactionDate: Date;
  declare periodYear: number;
  declare periodMonth: number;
  declare status: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const initRepaymentModel = (sequelize: Sequelize): typeof RepaymentModel => {
  RepaymentModel.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      loanId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'loan_id',
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      transactionDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'transaction_date',
      },
      periodYear: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'period_year',
      },
      periodMonth: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        field: 'period_month',
        validate: {
          min: 1,
          max: 12,
        },
      },
      status: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: 'repayments',
      modelName: 'Repayment',
      underscored: true,
    }
  );

  return RepaymentModel;
};
