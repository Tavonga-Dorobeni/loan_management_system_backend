'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('borrowers', {
      id: {
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      first_name: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      last_name: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      id_number: {
        allowNull: false,
        type: Sequelize.STRING(100),
        unique: true,
      },
      phone_number: {
        allowNull: true,
        type: Sequelize.STRING(50),
      },
      email: {
        allowNull: true,
        type: Sequelize.STRING(255),
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
    await queryInterface.dropTable('borrowers');
  },
};
