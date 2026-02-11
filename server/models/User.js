import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const createUser = async (email, password, firstName, lastName, role = 'team_member') => {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING id, email, first_name, last_name, role, created_at`,
        [email, passwordHash, firstName, lastName, role]
    );

    return result.rows[0];
};

export const findUserByEmail = async (email) => {
    const result = await query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
    );
    return result.rows[0];
};

export const findUserById = async (id) => {
    const result = await query(
        'SELECT id, email, first_name, last_name, role, is_active, created_at FROM users WHERE id = $1',
        [id]
    );
    return result.rows[0];
};

export const verifyPassword = async (password, passwordHash) => {
    return await bcrypt.compare(password, passwordHash);
};

export const getAllUsers = async (role = null) => {
    let queryText = 'SELECT id, email, first_name, last_name, role, is_active, created_at FROM users WHERE is_active = true';
    const params = [];

    if (role) {
        queryText += ' AND role = $1';
        params.push(role);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    return result.rows;
};

export const updateUser = async (id, updates) => {
    const allowedFields = ['first_name', 'last_name', 'role', 'is_active'];
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
    }

    if (fields.length === 0) {
        throw new Error('No valid fields to update');
    }

    values.push(id);
    const result = await query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} 
     RETURNING id, email, first_name, last_name, role, is_active, updated_at`,
        values
    );

    return result.rows[0];
};
