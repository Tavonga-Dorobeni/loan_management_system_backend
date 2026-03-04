'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      first_name: {
        allowNull: false,
        type: Sequelize.STRING(100)
      },
      last_name: {
        allowNull: false,
        type: Sequelize.STRING(100)
      },
      email: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING(255)
      },
      role: {
        allowNull: false,
        type: Sequelize.ENUM(
          'admin',
          'loan_officer',
          'credit_analyst',
          'collections_officer',
          'customer_support'
        ),
        defaultValue: 'loan_officer'
      },
      status: {
        allowNull: false,
        type: Sequelize.STRING(50),
        defaultValue: 'pending'
      },
      password_hash: {
        allowNull: true,
        type: Sequelize.STRING(255)
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  }
};
