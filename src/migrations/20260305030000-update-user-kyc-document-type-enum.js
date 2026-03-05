'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE user_kyc
      SET document_type = 'application_form'
      WHERE document_type NOT IN ('payslip', 'national_id', 'passport_sized_photo', 'application_form');
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE user_kyc
      MODIFY COLUMN document_type ENUM('payslip', 'national_id', 'passport_sized_photo', 'application_form') NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE user_kyc
      MODIFY COLUMN document_type ENUM(
        'national_id',
        'passport',
        'drivers_license',
        'proof_of_residence',
        'bank_statement',
        'payslip',
        'employment_letter',
        'tax_certificate'
      ) NOT NULL;
    `);
  },
};
