import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

import { type KycDocumentTypes, kycDocumentTypeValues } from '@/common/types/kyc';

export class UserKycModel extends Model<
  InferAttributes<UserKycModel>,
  InferCreationAttributes<UserKycModel>
> {
  declare id: CreationOptional<string>;
  declare userId: number;
  declare documentType: KycDocumentTypes;
  declare documentUrl: string;
  declare storageKey: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const initUserKycModel = (sequelize: Sequelize): typeof UserKycModel => {
  UserKycModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'user_id',
      },
      documentType: {
        type: DataTypes.ENUM(...kycDocumentTypeValues),
        allowNull: false,
        field: 'document_type',
      },
      documentUrl: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'document_url',
      },
      storageKey: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: 'storage_key',
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: 'user_kyc',
      modelName: 'UserKyc',
      underscored: true,
    }
  );

  return UserKycModel;
};
