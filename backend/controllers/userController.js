import bcrypt from 'bcryptjs';
import * as db from '../config/database.js';

// Search user by email
export const searchUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: 'Email parameter is required' });
    }
    console.log(email);
    // Search for user by email
    const user = await db.getOne(
      `SELECT u.id, u.person_id as personId, u.email, u.role, u.status, u.last_login as lastLogin,
       u.created_at as createdAt, u.updated_at as updatedAt,
       CONCAT(p.first_name, ' ', p.last_name) as name, p.person_type as personType
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.email = ?`,
      [email]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error searching user by email:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all users
export const getUsers = async (req, res) => {
  try {
    const { programId } = req.query;
    
    // Base query to get users with their associated person
    let query = `
      SELECT u.id, u.person_id as personId, u.email, u.role, u.status, u.last_login as lastLogin,
      u.created_at as createdAt, u.updated_at as updatedAt,
      CONCAT(p.first_name, ' ', p.last_name) as name, p.person_type as personType,
      up.status as programStatus
      FROM users u
      LEFT JOIN people p ON u.person_id = p.id
    `;
    
    const params = [];
    
    // Add program filter if programId is provided
    if (programId) {
      query += `
        JOIN user_programs up ON u.id = up.user_id
        WHERE up.program_id = ?
      `;
      params.push(programId);
    } else {
      query += `
        LEFT JOIN user_programs up ON u.id = up.user_id AND up.is_current = TRUE
      `;
    }
    
    query += ` ORDER BY u.created_at DESC`;
    
    const users = await db.query(query, params);
    
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
    
    // Check if user is requesting their own data or is an admin
    if (req.user.id !== parseInt(id) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You can only access your own user data' });
    }
    
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
    const { personId, email, password, role, programId } = req.body;
    
    // Get the current program from user_programs table
    let currentProgramId = programId;
    if (!currentProgramId) {
      const userProgram = await db.getOne(
        'SELECT program_id FROM user_programs WHERE user_id = ? AND is_current = TRUE',
        [req.user.id]
      );
      currentProgramId = userProgram?.program_id;
    }
    
    // Check if email already exists
    const existingUser = await db.getOne(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser) {
      // Check if user is already in this program
      const existingUserProgram = await db.getOne(
        'SELECT * FROM user_programs WHERE user_id = ? AND program_id = ?',
        [existingUser.id, currentProgramId]
      );
      
      if (existingUserProgram) {
        return res.status(400).json({ message: 'User already exists in this program' });
      }
      
      // Start transaction to add user to new program
      await db.transaction(async (connection) => {
        // Add user to the new program
        await connection.execute(
          'INSERT INTO user_programs (user_id, program_id, is_current, status) VALUES (?, ?, ?, ?)',
          [existingUser.id, currentProgramId, false, 'ACTIVE']
        );
        
        // Update person_id if provided and different
        if (personId && personId !== existingUser.person_id) {
          await connection.execute(
            'UPDATE users SET person_id = ?, updated_at = NOW() WHERE id = ?',
            [personId, existingUser.id]
          );
        }
        
        // Update role if different
        if (role && role !== existingUser.role) {
          await connection.execute(
            'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
            [role, existingUser.id]
          );
        }
      });
      
      // Get the updated user
      const updatedUser = await db.getOne(
        `SELECT u.id, u.person_id as personId, u.email, u.role, u.status, u.last_login as lastLogin,
         u.created_at as createdAt, u.updated_at as updatedAt,
         CONCAT(p.first_name, ' ', p.last_name) as personName, p.person_type as personType,
         'ACTIVE' as programStatus
         FROM users u
         LEFT JOIN people p ON u.person_id = p.id
         WHERE u.id = ?`,
        [existingUser.id]
      );
      
      return res.status(201).json(updatedUser);
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
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Start transaction
    const result = await db.transaction(async (connection) => {
      // Insert user
      const [userResult] = await connection.execute(
        'INSERT INTO users (person_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
        [personId || null, email, passwordHash, role, 'ACTIVE']
      );
      
      const userId = userResult.insertId;
      
      // Add user to program
      await connection.execute(
        'INSERT INTO user_programs (user_id, program_id, is_current, status) VALUES (?, ?, ?, ?)',
        [userId, currentProgramId, false, 'ACTIVE']
      );
      
      return { userId };
    });
    
    // Get the created user
    const user = await db.getOne(
      `SELECT u.id, u.person_id as personId, u.email, u.role, u.status, u.last_login as lastLogin,
       u.created_at as createdAt, u.updated_at as updatedAt,
       CONCAT(p.first_name, ' ', p.last_name) as name, p.person_type as personType,
       'ACTIVE' as programStatus
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.id = ?`,
      [result.userId]
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
    const { email, role, status, personId, programStatus } = req.body;
    
    // Prevent users from updating their own account
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ message: 'You cannot edit your own account. Use the profile page instead.' });
    }
    
    // Get the current program from the requesting user
    const currentUserProgram = await db.getOne(
      'SELECT program_id FROM user_programs WHERE user_id = ? AND is_current = TRUE',
      [req.user.id]
    );
    
    const currentProgramId = currentUserProgram?.program_id;
    
    // Check if user exists
    const existingUser = await db.getOne(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email already exists in the same program (if changing email)
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
    
    // Start transaction to update both users and user_programs tables
    await db.transaction(async (connection) => {
      // Update user table (only if email, role, or personId changed)
      if (email || role || personId !== undefined) {
        await connection.execute(
          'UPDATE users SET email = ?, role = ?, person_id = ?, updated_at = NOW() WHERE id = ?',
          [
            email || existingUser.email,
            role || existingUser.role,
            personId !== undefined ? personId : existingUser.person_id,
            id
          ]
        );
      }
      
      // Update program-specific status if programStatus is provided
      if (programStatus && currentProgramId) {
        await connection.execute(
          'UPDATE user_programs SET status = ?, updated_at = NOW() WHERE user_id = ? AND program_id = ?',
          [programStatus, id, currentProgramId]
        );
      }
      
      // Update global user status if status is provided
      if (status) {
        await connection.execute(
          'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
          [status, id]
        );
      }
    });
    
    // Get the updated user
    const updatedUser = await db.getOne(
      `SELECT u.id, u.person_id as personId, u.email, u.role, u.status, u.last_login as lastLogin,
       u.created_at as createdAt, u.updated_at as updatedAt,
       CONCAT(p.first_name, ' ', p.last_name) as name, p.person_type as personType,
       COALESCE((SELECT up.status FROM user_programs up WHERE up.user_id = u.id AND up.program_id = ? LIMIT 1), 'ACTIVE') as programStatus
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.id = ?`,
      [currentProgramId, id]
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
    const requestingUserId = req.user.id;
    
    // Prevent users from deleting their own account
    if (parseInt(id) === requestingUserId) {
      return res.status(403).json({ message: 'You cannot delete your own account' });
    }
    
    // Check if user exists
    const existingUser = await db.getOne(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get the current program from the requesting user
    const currentUserProgram = await db.getOne(
      'SELECT program_id FROM user_programs WHERE user_id = ? AND is_current = TRUE',
      [requestingUserId]
    );
    
    if (!currentUserProgram) {
      return res.status(400).json({ message: 'No current program found for requesting user' });
    }
    
    const currentProgramId = currentUserProgram.program_id;
    
    // Check if user is associated with the current program
    const userProgramRelation = await db.getOne(
      'SELECT * FROM user_programs WHERE user_id = ? AND program_id = ?',
      [id, currentProgramId]
    );
    
    if (!userProgramRelation) {
      return res.status(400).json({ message: 'User is not associated with the current program' });
    }
    
    // Check if user has other program associations
    const otherProgramAssociations = await db.query(
      'SELECT COUNT(*) as count FROM user_programs WHERE user_id = ? AND program_id != ?',
      [id, currentProgramId]
    );
    
    const hasOtherPrograms = otherProgramAssociations[0].count > 0;
    
    // Start transaction
    await db.transaction(async (connection) => {
      // Remove user from current program
      await connection.execute(
        'DELETE FROM user_programs WHERE user_id = ? AND program_id = ?',
        [id, currentProgramId]
      );
      
      // If user has no other program associations, delete the user entirely
      if (!hasOtherPrograms) {
        await connection.execute(
          'DELETE FROM users WHERE id = ?',
          [id]
        );
      }
    });
    
    res.json({ 
      message: hasOtherPrograms 
        ? 'User removed from current program successfully' 
        : 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset user password
export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await db.getOne(
      `SELECT u.id, u.email, p.first_name, p.last_name
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.id = ?`,
      [id]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate default password based on name
    let defaultPassword;
    if (user.first_name && user.last_name) {
      defaultPassword = `${user.first_name.toLowerCase()}.${user.last_name.toLowerCase()}`;
    } else {
      // If no name is available, use email as base for password
      const emailParts = user.email.split('@');
      defaultPassword = emailParts[0];
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    // Update password
    await db.update(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, id]
    );
    
    res.json({ 
      message: 'Password reset successfully',
      defaultPassword // Return the default password in the response
    });
  } catch (error) {
    console.error('Error resetting password:', error);
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

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user with person details
    const user = await db.getOne(
      `SELECT u.id, u.email, u.role, u.status, 
       p.id as person_id, p.first_name, p.last_name, p.phone, p.address, p.profile_image_url
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.id = ?`,
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Format response
    const profile = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : '',
      phone: user.phone || '',
      address: user.address || '',
      profile_image_url: user.profile_image_url || null
    };
    
    res.json(profile);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  console.log('profileImage');
  try {
    const userId = req.user.id;
    const { name, phone, address, profileImage, profile_image_url } = req.body;
    // Get user
    const user = await db.getOne(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      console.log('user not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has a person record
    if (!user.person_id) {
      return res.status(400).json({ message: 'User does not have an associated person record' });
    }
    
    // Get person
    const person = await db.getOne(
      'SELECT * FROM people WHERE id = ?',
      [user.person_id]
    );
    
    if (!person) {
      console.log('person not found');
      return res.status(404).json({ message: 'Person record not found' });
    }
    
    // Split name into first and last name
    let firstName = person.first_name;
    let lastName = person.last_name;
    
    if (name && name.trim() !== '') {
      const nameParts = name.trim().split(' ');
      if (nameParts.length > 1) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      } else {
        firstName = name;
        lastName = '';
      }
    }
    
    // Update person
    await db.update(
      'UPDATE people SET first_name = ?, last_name = ?, phone = ?, address = ?, profile_image_url = ?, updated_at = NOW() WHERE id = ?',
      [firstName, lastName, phone || person.phone, address || person.address, profileImage || profile_image_url || person.profile_image_url, user.person_id]
    );
    
    // Get updated user profile
    const updatedUser = await db.getOne(
      `SELECT u.id, u.email, u.role, u.status, 
       p.id as person_id, p.first_name, p.last_name, p.phone, p.address, p.profile_image_url
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.id = ?`,
      [userId]
    );
    
    // Format response
    const updatedProfile = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      name: updatedUser.first_name && updatedUser.last_name ? `${updatedUser.first_name} ${updatedUser.last_name}` : '',
      phone: updatedUser.phone || '',
      address: updatedUser.address || '',
      profile_image_url: updatedUser.profile_image_url || null
    };
    
    res.json(updatedProfile);
  } catch (error) {
    console.error('Error updating user profile:', error);
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

export default {
  searchUserByEmail,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  resetPassword,
  getUserProfile,
  updateProfile,
  getRolePermissions,
  updateRolePermissions
};