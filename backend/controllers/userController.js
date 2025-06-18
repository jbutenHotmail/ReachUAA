import bcrypt from 'bcryptjs';
import * as db from '../config/database.js';

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await db.query(
      `SELECT u.id, u.person_id as personId, u.email, u.role, u.status, u.last_login as lastLogin,
       u.created_at as createdAt, u.updated_at as updatedAt,
       CONCAT(p.first_name, ' ', p.last_name) as personName, p.person_type as personType
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       ORDER BY u.created_at DESC`
    );
    
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await db.getOne(
      `SELECT u.id, u.person_id as personId, u.email, u.role, u.status, u.last_login as lastLogin,
       u.created_at as createdAt, u.updated_at as updatedAt,
       CONCAT(p.first_name, ' ', p.last_name) as personName, p.person_type as personType
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.id = ?`,
      [id]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new user
export const createUser = async (req, res) => {
  try {
    const { personId, email, password, role } = req.body;
    
    // Check if email already exists
    const existingUser = await db.getOne(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Check if person exists
    if (personId) {
      const person = await db.getOne(
        'SELECT * FROM people WHERE id = ?',
        [personId]
      );
      
      if (!person) {
        return res.status(404).json({ message: 'Person not found' });
      }
      
      // Check if person already has a user
      const existingPersonUser = await db.getOne(
        'SELECT * FROM users WHERE person_id = ?',
        [personId]
      );
      
      if (existingPersonUser) {
        return res.status(400).json({ message: 'Person already has a user account' });
      }
    }
    // Hash password
    console.log(personId, email, password, role,)
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert user
    const userId = await db.insert(
      'INSERT INTO users (person_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [personId, email, passwordHash, role, 'ACTIVE']
    );
    
    // Get the created user
    const user = await db.getOne(
      `SELECT u.id, u.person_id as personId, u.email, u.role, u.status, u.last_login as lastLogin,
       u.created_at as createdAt, u.updated_at as updatedAt,
       CONCAT(p.first_name, ' ', p.last_name) as personName, p.person_type as personType
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.id = ?`,
      [userId]
    );
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, status, personId } = req.body;
    
    // Check if user exists
    const existingUser = await db.getOne(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email already exists (if changing email)
    if (email && email !== existingUser.email) {
      const existingEmail = await db.getOne(
        'SELECT * FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }
    
    // Check if person exists (if changing person)
    if (personId && personId !== existingUser.person_id) {
      const person = await db.getOne(
        'SELECT * FROM people WHERE id = ?',
        [personId]
      );
      
      if (!person) {
        return res.status(404).json({ message: 'Person not found' });
      }
      
      // Check if person already has a user
      const existingPersonUser = await db.getOne(
        'SELECT * FROM users WHERE person_id = ? AND id != ?',
        [personId, id]
      );
      
      if (existingPersonUser) {
        return res.status(400).json({ message: 'Person already has a user account' });
      }
    }
    
    // Update user
    await db.update(
      'UPDATE users SET email = ?, role = ?, status = ?, person_id = ?, updated_at = NOW() WHERE id = ?',
      [
        email || existingUser.email,
        role || existingUser.role,
        status || existingUser.status,
        personId !== undefined ? personId : existingUser.person_id,
        id
      ]
    );
    
    // Get the updated user
    const updatedUser = await db.getOne(
      `SELECT u.id, u.person_id as personId, u.email, u.role, u.status, u.last_login as lastLogin,
       u.created_at as createdAt, u.updated_at as updatedAt,
       CONCAT(p.first_name, ' ', p.last_name) as personName, p.person_type as personType
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.id = ?`,
      [id]
    );
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await db.getOne(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete user
    await db.remove(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Get user
    const user = await db.getOne(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await db.update(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, userId]
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get role permissions
export const getRolePermissions = async (req, res) => {
  try {
    // Get all permissions
    const permissions = await db.query(
      'SELECT * FROM permissions ORDER BY name'
    );
    
    // Get role permissions
    const rolePermissions = await db.query(
      'SELECT role, permission_id FROM role_permissions'
    );
    
    // Format permissions by role
    const formattedPermissions = permissions.map(permission => {
      const roles = {
        ADMIN: rolePermissions.some(rp => rp.role === 'ADMIN' && rp.permission_id === permission.id),
        SUPERVISOR: rolePermissions.some(rp => rp.role === 'SUPERVISOR' && rp.permission_id === permission.id),
        VIEWER: rolePermissions.some(rp => rp.role === 'VIEWER' && rp.permission_id === permission.id)
      };
      
      return {
        id: permission.id,
        name: permission.name,
        description: permission.description,
        roles
      };
    });
    
    res.json(formattedPermissions);
  } catch (error) {
    console.error('Error getting role permissions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update role permissions
export const updateRolePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Invalid permissions data' });
    }
    
    // Start transaction
    await db.transaction(async (connection) => {
      // For each permission
      for (const permission of permissions) {
        const { id, roles } = permission;
        
        // Delete existing role permissions for this permission
        await connection.execute(
          'DELETE FROM role_permissions WHERE permission_id = ?',
          [id]
        );
        
        // Insert new role permissions
        if (roles.ADMIN) {
          await connection.execute(
            'INSERT INTO role_permissions (role, permission_id) VALUES (?, ?)',
            ['ADMIN', id]
          );
        }
        
        if (roles.SUPERVISOR) {
          await connection.execute(
            'INSERT INTO role_permissions (role, permission_id) VALUES (?, ?)',
            ['SUPERVISOR', id]
          );
        }
        
        if (roles.VIEWER) {
          await connection.execute(
            'INSERT INTO role_permissions (role, permission_id) VALUES (?, ?)',
            ['VIEWER', id]
          );
        }
      }
    });
    
    res.json({ message: 'Role permissions updated successfully' });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};