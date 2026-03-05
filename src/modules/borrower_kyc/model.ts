import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

import { type KycDocumentTypes, kycDocumentTypeValues } from '@/common/types/kyc';

export class BorrowerKycModel extends Model<
  InferAttributes<BorrowerKycModel>,
  InferCreationAttributes<BorrowerKycModel>
> {
  declare id: CreationOptional<string>;
  declare borrowerId: number;
  declare documentType: KycDocumentTypes;
  declare documentUrl: string;
  declare storageKey: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const initBorrowerKycModel = (
  sequelize: Sequelize
): typeof BorrowerKycModel => {
  BorrowerKycModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      borrowerId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'borrower_id',
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
      tableName: 'borrower_kyc',
      modelName: 'BorrowerKyc',
      underscored: true,
    }
  );

  return BorrowerKycModel;
};
