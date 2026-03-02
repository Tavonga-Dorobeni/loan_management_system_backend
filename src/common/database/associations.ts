import { sequelize } from '@/common/config/database.config';
import { FileModel, initFileModel } from '@/modules/files/model';
import { SessionModel, initSessionModel } from '@/modules/sessions/model';
import { UserModel, initUserModel } from '@/modules/users/model';
import {
  ExampleResourceModel,
  initExampleResourceModel,
} from '@/modules/example_resource/model';

export const initializeModels = (): void => {
  initUserModel(sequelize);
  initFileModel(sequelize);
  initSessionModel(sequelize);
  initExampleResourceModel(sequelize);
};

export const setupAssociations = (): void => {
  UserModel.hasMany(SessionModel, {
    foreignKey: 'userId',
    as: 'sessions',
  });

  SessionModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user',
  });
};
