'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loans', {
      id: {
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      borrower_id: {
        allowNull: false,
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: 'borrowers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reference_number: {
        allowNull: false,
        type: Sequelize.STRING(100),
        unique: true,
      },
      ec_number: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      type: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      status: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      start_date: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      end_date: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      disbursement_date: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      repayment_amount: {
        allowNull: false,
        type: Sequelize.DECIMAL(15, 2),
      },
      total_amount: {
        allowNull: false,
        type: Sequelize.DECIMAL(15, 2),
      },
      amount_paid: {
        allowNull: true,
        type: Sequelize.DECIMAL(15, 2),
      },
      amount_due: {
        allowNull: true,
        type: Sequelize.DECIMAL(15, 2),
      },
      message: {
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('loans');
  },
};
