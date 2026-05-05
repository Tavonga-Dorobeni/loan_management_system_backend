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

const getTableDefinition = async (queryInterface, tableName) => {
  if (!(await tableExists(queryInterface, tableName))) {
    return null;
  }

  return queryInterface.describeTable(tableName);
};

const columnExists = async (queryInterface, tableName, columnName) => {
  const definition = await getTableDefinition(queryInterface, tableName);
  return Boolean(definition?.[columnName]);
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

const constraintExists = async (queryInterface, tableName, constraintName) => {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
    `,
    {
      replacements: [tableName, constraintName],
    }
  );

  return rows.length > 0;
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'repayments'))) {
      return;
    }

    if (!(await columnExists(queryInterface, 'repayments', 'period_year'))) {
      await queryInterface.addColumn('repayments', 'period_year', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!(await columnExists(queryInterface, 'repayments', 'period_month'))) {
      await queryInterface.addColumn('repayments', 'period_month', {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE repayments
      SET
        period_year = YEAR(transaction_date),
        period_month = MONTH(transaction_date)
      WHERE period_year IS NULL OR period_month IS NULL
    `);

    await queryInterface.changeColumn('repayments', 'period_year', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.changeColumn('repayments', 'period_month', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
    });

    if (
      !(await constraintExists(
        queryInterface,
        'repayments',
        'chk_repayments_period_month_range'
      ))
    ) {
      await queryInterface.sequelize.query(`
        ALTER TABLE repayments
        ADD CONSTRAINT chk_repayments_period_month_range
        CHECK (period_month BETWEEN 1 AND 12)
      `);
    }

    await addIndexIfMissing(
      queryInterface,
      'repayments',
      ['period_year', 'period_month'],
      'idx_repayments_period_year_month'
    );
    await addIndexIfMissing(
      queryInterface,
      'repayments',
      ['loan_id', 'period_year', 'period_month'],
      'idx_repayments_loan_period_year_month'
    );
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'repayments'))) {
      return;
    }

    await removeIndexIfExists(
      queryInterface,
      'repayments',
      'idx_repayments_loan_period_year_month'
    );
    await removeIndexIfExists(
      queryInterface,
      'repayments',
      'idx_repayments_period_year_month'
    );

    if (
      await constraintExists(
        queryInterface,
        'repayments',
        'chk_repayments_period_month_range'
      )
    ) {
      await queryInterface.sequelize.query(`
        ALTER TABLE repayments
        DROP CHECK chk_repayments_period_month_range
      `);
    }

    if (await columnExists(queryInterface, 'repayments', 'period_month')) {
      await queryInterface.removeColumn('repayments', 'period_month');
    }

    if (await columnExists(queryInterface, 'repayments', 'period_year')) {
      await queryInterface.removeColumn('repayments', 'period_year');
    }
  },
};
