'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const userKycFks = await queryInterface.getForeignKeyReferencesForTable(
      'user_kyc'
    );
    for (const fk of userKycFks) {
      if (fk.columnName === 'user_id' && fk.constraintName) {
        await queryInterface.removeConstraint('user_kyc', fk.constraintName);
      }
    }

    await queryInterface.renameTable('user_kyc', 'borrower_kyc');
    await queryInterface.renameColumn('borrower_kyc', 'user_id', 'borrower_id');

    await queryInterface.changeColumn('borrower_kyc', 'borrower_id', {
      allowNull: false,
      type: Sequelize.INTEGER.UNSIGNED,
    });

    await queryInterface.addConstraint('borrower_kyc', {
      fields: ['borrower_id'],
      type: 'foreign key',
      name: 'fk_borrower_kyc_borrower_id',
      references: {
        table: 'borrowers',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    const borrowerKycFks = await queryInterface.getForeignKeyReferencesForTable(
      'borrower_kyc'
    );
    for (const fk of borrowerKycFks) {
      if (fk.columnName === 'borrower_id' && fk.constraintName) {
        await queryInterface.removeConstraint('borrower_kyc', fk.constraintName);
      }
    }

    await queryInterface.renameColumn('borrower_kyc', 'borrower_id', 'user_id');
    await queryInterface.renameTable('borrower_kyc', 'user_kyc');

    await queryInterface.changeColumn('user_kyc', 'user_id', {
      allowNull: false,
      type: Sequelize.INTEGER.UNSIGNED,
    });

    await queryInterface.addConstraint('user_kyc', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_user_kyc_user_id',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },
};
