'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_kyc', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
      },
      user_id: {
        allowNull: false,
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      document_type: {
        allowNull: false,
        type: Sequelize.ENUM(
          'national_id',
          'passport',
          'drivers_license',
          'proof_of_residence',
          'bank_statement',
          'payslip',
          'employment_letter',
          'tax_certificate'
        ),
      },
      document_url: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      storage_key: {
        allowNull: false,
        type: Sequelize.STRING(500),
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
    await queryInterface.dropTable('user_kyc');
  },
};
