import { sequelize } from '@/common/config/database.config';
import { UserModel, initUserModel } from '@/modules/users/model';
import { UserKycModel, initUserKycModel } from '@/modules/user_kyc/model';

export const initializeModels = (): void => {
  initUserModel(sequelize);
  initUserKycModel(sequelize);
};

export const setupAssociations = (): void => {
  UserModel.hasMany(UserKycModel, {
    foreignKey: 'userId',
    as: 'kycDocuments',
  });

  UserKycModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user',
  });
};
