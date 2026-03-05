import { sequelize } from '@/common/config/database.config';
import {
  BorrowerKycModel,
  initBorrowerKycModel,
} from '@/modules/borrower_kyc/model';
import { BorrowerModel, initBorrowerModel } from '@/modules/borrowers/model';
import { LoanModel, initLoanModel } from '@/modules/loans/model';
import { RepaymentModel, initRepaymentModel } from '@/modules/repayments/model';
import { initUserModel } from '@/modules/users/model';

export const initializeModels = (): void => {
  initBorrowerKycModel(sequelize);
  initBorrowerModel(sequelize);
  initLoanModel(sequelize);
  initRepaymentModel(sequelize);
  initUserModel(sequelize);
};

export const setupAssociations = (): void => {
  BorrowerModel.hasMany(BorrowerKycModel, {
    foreignKey: 'borrowerId',
    as: 'kycDocuments',
  });

  BorrowerKycModel.belongsTo(BorrowerModel, {
    foreignKey: 'borrowerId',
    as: 'borrower',
  });

  BorrowerModel.hasMany(LoanModel, {
    foreignKey: 'borrowerId',
    as: 'loans',
  });

  LoanModel.belongsTo(BorrowerModel, {
    foreignKey: 'borrowerId',
    as: 'borrower',
  });

  LoanModel.hasMany(RepaymentModel, {
    foreignKey: 'loanId',
    as: 'repayments',
  });

  RepaymentModel.belongsTo(LoanModel, {
    foreignKey: 'loanId',
    as: 'loan',
  });
};
