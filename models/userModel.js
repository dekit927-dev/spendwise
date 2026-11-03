const { db } = require('../config/db');

const UserModel = {
  async findByEmail(email) {
    return await db.oneOrNone('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  },

  async findById(id) {
    return await db.oneOrNone(
      'SELECT id, name, email, currency, monthly_income, avatar, phone_number, cid_number, dzongkhag, is_verified, created_at FROM users WHERE id = ?',
      [id]
    );
  },

  async create({ name, email, password, currency = 'Nu.', monthly_income = 0, phone_number = null, cid_number = null, dzongkhag = null, is_verified = true, verification_code = null }) {
    return await db.one(
      `INSERT INTO users (name, email, password, currency, monthly_income, phone_number, cid_number, dzongkhag, is_verified, verification_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, name, email, currency, monthly_income, avatar, phone_number, cid_number, dzongkhag, is_verified, created_at`,
      [name, email.toLowerCase().trim(), password, currency, monthly_income, phone_number, cid_number, dzongkhag, is_verified, verification_code]
    );
  },

  async updateProfile(id, { name, currency, monthly_income, avatar, phone_number, cid_number, dzongkhag }) {
    let sql = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const params = [];

    if (name) {
      params.push(name);
      sql += `, name = ?`;
    }
    if (currency) {
      params.push(currency);
      sql += `, currency = ?`;
    }
    if (monthly_income !== undefined) {
      params.push(monthly_income);
      sql += `, monthly_income = ?`;
    }
    if (avatar) {
      params.push(avatar);
      sql += `, avatar = ?`;
    }
    if (phone_number !== undefined) {
      params.push(phone_number);
      sql += `, phone_number = ?`;
    }
    if (cid_number !== undefined) {
      params.push(cid_number);
      sql += `, cid_number = ?`;
    }
    if (dzongkhag !== undefined) {
      params.push(dzongkhag);
      sql += `, dzongkhag = ?`;
    }

    params.push(id);
    sql += ` WHERE id = ? RETURNING id, name, email, currency, monthly_income, avatar, phone_number, cid_number, dzongkhag, is_verified`;
    return await db.one(sql, params);
  },

  async updatePassword(id, hashedPassword) {
    return await db.none(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );
  }
};

module.exports = UserModel;
