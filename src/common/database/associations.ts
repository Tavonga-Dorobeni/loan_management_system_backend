import { sequelize } from '@/common/config/database.config';
import {
  ActivityLogModel,
  initActivityLogModel,
} from '@/modules/activity_logs/model';
import {
  BorrowerKycModel,
  initBorrowerKycModel,
} from '@/modules/borrower_kyc/model';
import { BorrowerModel, initBorrowerModel } from '@/modules/borrowers/model';
import { LoanModel, initLoanModel } from '@/modules/loans/model';
import {
  NotificationDeliveryModel,
  initNotificationDeliveryModel,
} from '@/modules/notifications/model';
import { RepaymentModel, initRepaymentModel } from '@/modules/repayments/model';
import { UserModel, initUserModel } from '@/modules/users/model';

export const initializeModels = (): void => {
  initActivityLogModel(sequelize);
  initBorrowerKycModel(sequelize);
  initBorrowerModel(sequelize);
  initLoanModel(sequelize);
  initNotificationDeliveryModel(sequelize);
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

  ActivityLogModel.belongsTo(UserModel, {
    foreignKey: 'actorUserId',
    as: 'actor',
  });

  UserModel.hasMany(ActivityLogModel, {
    foreignKey: 'actorUserId',
    as: 'activityLogs',
  });

  void NotificationDeliveryModel;
};
