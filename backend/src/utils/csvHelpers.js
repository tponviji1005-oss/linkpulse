const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

function parseCSV(buffer) {
  const text = buffer.toString('utf-8');
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  return records;
}

function generateCSV(rows, columns) {
  return stringify(rows, { header: true, columns });
}

module.exports = { parseCSV, generateCSV };
