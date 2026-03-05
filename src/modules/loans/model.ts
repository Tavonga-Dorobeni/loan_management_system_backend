import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class LoanModel extends Model<
  InferAttributes<LoanModel>,
  InferCreationAttributes<LoanModel>
> {
  declare id: CreationOptional<number>;
  declare borrowerId: number;
  declare referenceNumber: string;
  declare ecNumber: string;
  declare type: string;
  declare status: string;
  declare startDate: Date;
  declare endDate: Date;
  declare disbursementDate: Date | null;
  declare repaymentAmount: number;
  declare totalAmount: number;
  declare amountPaid: number | null;
  declare amountDue: number | null;
  declare message: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const initLoanModel = (sequelize: Sequelize): typeof LoanModel => {
  LoanModel.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      borrowerId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'borrower_id',
      },
      referenceNumber: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'reference_number',
      },
      ecNumber: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'ec_number',
      },
      type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_date',
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'end_date',
      },
      disbursementDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'disbursement_date',
      },
      repaymentAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        field: 'repayment_amount',
      },
      totalAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        field: 'total_amount',
      },
      amountPaid: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'amount_paid',
      },
      amountDue: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'amount_due',
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: 'loans',
      modelName: 'Loan',
      underscored: true,
    }
  );

  return LoanModel;
};
