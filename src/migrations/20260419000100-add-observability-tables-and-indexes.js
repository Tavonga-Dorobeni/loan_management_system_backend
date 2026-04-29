'use strict';

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((entry) => {
    if (typeof entry === 'string') {
      return entry === tableName;
    }

    if (Array.isArray(entry)) {
      return entry[1] === tableName;
    }

    return false;
  });
};

const indexExists = async (queryInterface, tableName, indexName) => {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((index) => index.name === indexName);
};

const addIndexIfMissing = async (queryInterface, tableName, fields, name) => {
  if (await indexExists(queryInterface, tableName, name)) {
    return;
  }

  await queryInterface.addIndex(tableName, fields, { name });
};

const removeIndexIfExists = async (queryInterface, tableName, name) => {
  if (!(await tableExists(queryInterface, tableName))) {
    return;
  }

  if (!(await indexExists(queryInterface, tableName, name))) {
    return;
  }

  await queryInterface.removeIndex(tableName, name);
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'activity_logs'))) {
      await queryInterface.createTable('activity_logs', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER.UNSIGNED,
        },
        actor_user_id: {
          allowNull: true,
          type: Sequelize.INTEGER.UNSIGNED,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        actor_role: {
          allowNull: true,
          type: Sequelize.STRING(50),
        },
        entity_type: {
          allowNull: false,
          type: Sequelize.STRING(100),
        },
        entity_id: {
          allowNull: true,
          type: Sequelize.STRING(100),
        },
        action: {
          allowNull: false,
          type: Sequelize.STRING(100),
        },
        summary: {
          allowNull: false,
          type: Sequelize.TEXT,
        },
        metadata: {
          allowNull: true,
          type: Sequelize.JSON,
        },
        source_type: {
          allowNull: false,
          type: Sequelize.STRING(50),
        },
        source_reference: {
          allowNull: true,
          type: Sequelize.STRING(255),
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }

    if (!(await tableExists(queryInterface, 'notification_deliveries'))) {
      await queryInterface.createTable('notification_deliveries', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER.UNSIGNED,
        },
        event_type: {
          allowNull: false,
          type: Sequelize.STRING(100),
        },
        recipient: {
          allowNull: false,
          type: Sequelize.STRING(255),
        },
        subject: {
          allowNull: false,
          type: Sequelize.STRING(255),
        },
        status: {
          allowNull: false,
          type: Sequelize.STRING(50),
        },
        provider_message_id: {
          allowNull: true,
          type: Sequelize.STRING(255),
        },
        error_message: {
          allowNull: true,
          type: Sequelize.TEXT,
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }

    await addIndexIfMissing(
      queryInterface,
      'loans',
      ['borrower_id'],
      'idx_loans_borrower_id'
    );
    await addIndexIfMissing(
      queryInterface,
      'loans',
      ['status'],
      'idx_loans_status'
    );
    await addIndexIfMissing(
      queryInterface,
      'repayments',
      ['loan_id'],
      'idx_repayments_loan_id'
    );
    await addIndexIfMissing(
      queryInterface,
      'repayments',
      ['transaction_date'],
      'idx_repayments_transaction_date'
    );

    await addIndexIfMissing(
      queryInterface,
      'activity_logs',
      ['actor_user_id'],
      'idx_activity_logs_actor_user_id'
    );
    await addIndexIfMissing(
      queryInterface,
      'activity_logs',
      ['entity_type', 'entity_id'],
      'idx_activity_logs_entity'
    );
    await addIndexIfMissing(
      queryInterface,
      'activity_logs',
      ['source_type'],
      'idx_activity_logs_source_type'
    );
    await addIndexIfMissing(
      queryInterface,
      'activity_logs',
      ['created_at'],
      'idx_activity_logs_created_at'
    );

    await addIndexIfMissing(
      queryInterface,
      'notification_deliveries',
      ['event_type'],
      'idx_notification_deliveries_event_type'
    );
    await addIndexIfMissing(
      queryInterface,
      'notification_deliveries',
      ['status'],
      'idx_notification_deliveries_status'
    );
    await addIndexIfMissing(
      queryInterface,
      'notification_deliveries',
      ['recipient'],
      'idx_notification_deliveries_recipient'
    );
    await addIndexIfMissing(
      queryInterface,
      'notification_deliveries',
      ['created_at'],
      'idx_notification_deliveries_created_at'
    );
  },

  async down(queryInterface) {
    await removeIndexIfExists(queryInterface, 'notification_deliveries', 'idx_notification_deliveries_created_at');
    await removeIndexIfExists(queryInterface, 'notification_deliveries', 'idx_notification_deliveries_recipient');
    await removeIndexIfExists(queryInterface, 'notification_deliveries', 'idx_notification_deliveries_status');
    await removeIndexIfExists(queryInterface, 'notification_deliveries', 'idx_notification_deliveries_event_type');
    await removeIndexIfExists(queryInterface, 'activity_logs', 'idx_activity_logs_created_at');
    await removeIndexIfExists(queryInterface, 'activity_logs', 'idx_activity_logs_source_type');
    await removeIndexIfExists(queryInterface, 'activity_logs', 'idx_activity_logs_entity');
    await removeIndexIfExists(queryInterface, 'activity_logs', 'idx_activity_logs_actor_user_id');
    await removeIndexIfExists(queryInterface, 'repayments', 'idx_repayments_transaction_date');
    await removeIndexIfExists(queryInterface, 'repayments', 'idx_repayments_loan_id');
    await removeIndexIfExists(queryInterface, 'loans', 'idx_loans_status');
    await removeIndexIfExists(queryInterface, 'loans', 'idx_loans_borrower_id');

    if (await tableExists(queryInterface, 'notification_deliveries')) {
      await queryInterface.dropTable('notification_deliveries');
    }

    if (await tableExists(queryInterface, 'activity_logs')) {
      await queryInterface.dropTable('activity_logs');
    }
  },
};
