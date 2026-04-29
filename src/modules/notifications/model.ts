import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

import type { NotificationDeliveryStatus } from '@/modules/notifications/dto';

export class NotificationDeliveryModel extends Model<
  InferAttributes<NotificationDeliveryModel>,
  InferCreationAttributes<NotificationDeliveryModel>
> {
  declare id: CreationOptional<number>;
  declare eventType: string;
  declare recipient: string;
  declare subject: string;
  declare status: NotificationDeliveryStatus;
  declare providerMessageId: string | null;
  declare errorMessage: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const initNotificationDeliveryModel = (
  sequelize: Sequelize
): typeof NotificationDeliveryModel => {
  NotificationDeliveryModel.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      eventType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'event_type',
      },
      recipient: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      subject: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      providerMessageId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'provider_message_id',
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'error_message',
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: 'notification_deliveries',
      modelName: 'NotificationDelivery',
      underscored: true,
    }
  );

  return NotificationDeliveryModel;
};
