'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('borrowers', 'ec_number', {
      allowNull: true,
      type: Sequelize.STRING(100),
    });

    await queryInterface.sequelize.query(`
      UPDATE borrowers
      SET ec_number = CONCAT('EC-', id)
      WHERE ec_number IS NULL OR ec_number = '';
    `);

    await queryInterface.changeColumn('borrowers', 'ec_number', {
      allowNull: false,
      type: Sequelize.STRING(100),
    });

    await queryInterface.addConstraint('borrowers', {
      fields: ['ec_number'],
      type: 'unique',
      name: 'uq_borrowers_ec_number',
    });

    await queryInterface.removeColumn('loans', 'ec_number');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('loans', 'ec_number', {
      allowNull: true,
      type: Sequelize.STRING(100),
    });

    await queryInterface.sequelize.query(`
      UPDATE loans l
      JOIN borrowers b ON b.id = l.borrower_id
      SET l.ec_number = b.ec_number
      WHERE l.ec_number IS NULL OR l.ec_number = '';
    `);

    await queryInterface.changeColumn('loans', 'ec_number', {
      allowNull: false,
      type: Sequelize.STRING(100),
    });

    await queryInterface.removeConstraint('borrowers', 'uq_borrowers_ec_number');
    await queryInterface.removeColumn('borrowers', 'ec_number');
  },
};
