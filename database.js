const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, 'rocket.db');
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Epics table
      `CREATE TABLE IF NOT EXISTS epics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        pastille_color TEXT DEFAULT '#FF6B6B',
        position INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now', 'utc'))
      )`,
      
      // Tasks table
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        epic_id INTEGER NOT NULL,
        content TEXT NOT NULL CHECK(length(content) <= 150),
        position INTEGER DEFAULT 0,
        is_completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now', 'utc')),
        updated_at DATETIME DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (epic_id) REFERENCES epics (id) ON DELETE CASCADE
      )`,
      
      // Activity log table
      `CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT DEFAULT 'user',
        action_type TEXT NOT NULL,
        task_id INTEGER,
        epic_id INTEGER,
        details TEXT,
        timestamp DATETIME DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL,
        FOREIGN KEY (epic_id) REFERENCES epics (id) ON DELETE SET NULL
      )`,
      
      // App config table
      `CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    // Create indexes for better performance
    await this.run('CREATE INDEX IF NOT EXISTS idx_tasks_epic_id ON tasks(epic_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_epics_position ON epics(position)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp)');

    // Initialize default data
    await this.initializeDefaultData();
  }

  async initializeDefaultData() {
    // Check if we already have data
    const epicCount = await this.get('SELECT COUNT(*) as count FROM epics');
    if (epicCount.count === 0) {
      // Create default epic
      await this.run("INSERT INTO epics (name, pastille_color, position) VALUES ('General', '#FF6B6B', 0)");
      
      // Create some sample tasks
      const generalEpic = await this.get('SELECT id FROM epics WHERE name = ?', ['General']);
      if (generalEpic) {
        await this.run("INSERT INTO tasks (epic_id, content, position) VALUES (?, 'Welcome to Sand Rocket! 🚀', 0)", [generalEpic.id]);
        await this.run("INSERT INTO tasks (epic_id, content, position) VALUES (?, 'Create your first epic', 1)", [generalEpic.id]);
        await this.run("INSERT INTO tasks (epic_id, content, position) VALUES (?, 'Add some tasks to get started', 2)", [generalEpic.id]);
      }
    }

    // Set default password if not exists (using new format: bcrypt(SHA-256(password)))
    const passwordConfig = await this.get('SELECT value FROM app_config WHERE key = ?', ['password']);
    if (!passwordConfig) {
      const sha256Hash = crypto.createHash('sha256').update('rocket123').digest('hex');
      const hashedPassword = await bcrypt.hash(sha256Hash, 10);
      await this.run('INSERT INTO app_config (key, value) VALUES (?, ?)', ['password', hashedPassword]);
    }
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Database run error:', err.message);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Database get error:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database all error:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Epic methods
  async getEpics() {
    return this.all('SELECT * FROM epics ORDER BY position ASC');
  }

  async getEpicById(id) {
    return this.get('SELECT * FROM epics WHERE id = ?', [id]);
  }

  async createEpic(name, pastilleColor = '#FF6B6B') {
    const maxPosition = await this.get('SELECT MAX(position) as max FROM epics');
    const position = (maxPosition?.max ?? -1) + 1;
    const utcTimestamp = new Date().toISOString();
    
    const result = await this.run(
      'INSERT INTO epics (name, pastille_color, position, created_at) VALUES (?, ?, ?, ?)',
      [name, pastilleColor, position, utcTimestamp]
    );
    
    await this.logActivity('epic_created', null, result.id, { name, pastilleColor, position });
    return result;
  }

  async updateEpic(id, updates) {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    
    await this.run(`UPDATE epics SET ${setClause} WHERE id = ?`, values);
    await this.logActivity('epic_updated', null, id, updates);
  }

  async deleteEpic(id) {
    await this.run('DELETE FROM epics WHERE id = ?', [id]);
    await this.logActivity('epic_deleted', null, id, {});
  }

  // Task methods
  async getTasks(epicId = null) {
    const sql = epicId 
      ? 'SELECT * FROM tasks WHERE epic_id = ? ORDER BY position ASC'
      : 'SELECT * FROM tasks ORDER BY epic_id ASC, position ASC';
    const params = epicId ? [epicId] : [];
    return this.all(sql, params);
  }

  async getTaskById(id) {
    return this.get('SELECT * FROM tasks WHERE id = ?', [id]);
  }

  async createTask(epicId, content) {
    if (content.length > 150) {
      throw new Error('Task content cannot exceed 150 characters');
    }
    
    const maxPosition = await this.get('SELECT MAX(position) as max FROM tasks WHERE epic_id = ?', [epicId]);
    const position = (maxPosition?.max ?? -1) + 1;
    const utcTimestamp = new Date().toISOString();
    
    const result = await this.run(
      'INSERT INTO tasks (epic_id, content, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [epicId, content, position, utcTimestamp, utcTimestamp]
    );
    
    await this.logActivity('task_created', result.id, epicId, { content, position });
    return result;
  }

  async updateTask(id, updates) {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    const utcTimestamp = new Date().toISOString();
    
    await this.run(`UPDATE tasks SET ${setClause}, updated_at = ? WHERE id = ?`, [...values.slice(0, -1), utcTimestamp, id]);
    
    const task = await this.get('SELECT * FROM tasks WHERE id = ?', [id]);
    await this.logActivity('task_updated', id, task?.epic_id, updates);
  }

  async deleteTask(id) {
    const task = await this.get('SELECT * FROM tasks WHERE id = ?', [id]);
    await this.run('DELETE FROM tasks WHERE id = ?', [id]);
    await this.logActivity('task_deleted', id, task?.epic_id, { content: task?.content });
  }

  async completeTask(id) {
    await this.updateTask(id, { is_completed: 1 });
  }

  async reopenTask(id) {
    await this.updateTask(id, { is_completed: 0 });
  }

  async getCompletedTasks() {
    return this.all('SELECT * FROM tasks WHERE is_completed = 1 ORDER BY updated_at DESC');
  }

  // Activity log methods
  async logActivity(actionType, taskId, epicId, details) {
    const utcTimestamp = new Date().toISOString();
    // If details is already a string (our new format), use it directly
    // If it's an object (old format), stringify it
    const detailsString = typeof details === 'string' ? details : JSON.stringify(details);
    await this.run(
      'INSERT INTO activity_log (action_type, task_id, epic_id, details, timestamp) VALUES (?, ?, ?, ?, ?)',
      [actionType, taskId, epicId, detailsString, utcTimestamp]
    );
  }

  async getActivityLog(limit = 50) {
    return this.all(`
      SELECT al.*, t.content as task_content, e.name as epic_name 
      FROM activity_log al
      LEFT JOIN tasks t ON al.task_id = t.id
      LEFT JOIN epics e ON al.epic_id = e.id
      ORDER BY al.timestamp DESC
      LIMIT ?
    `, [limit]);
  }

  async getWeeklyStats() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const created = await this.get(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE created_at >= ?
    `, [weekAgo.toISOString()]);
    
    const completed = await this.get(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE is_completed = 1 AND updated_at >= ?
    `, [weekAgo.toISOString()]);
    
    return {
      created: created.count,
      completed: completed.count
    };
  }

  // Authentication methods
  async getPassword() {
    const config = await this.get('SELECT value FROM app_config WHERE key = ?', ['password']);
    return config?.value;
  }

  async setPassword(newPassword) {
    // Hash password with SHA-256 first, then bcrypt the hash
    const sha256Hash = crypto.createHash('sha256').update(newPassword).digest('hex');
    const hashedPassword = await bcrypt.hash(sha256Hash, 10);
    await this.run('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)', ['password', hashedPassword]);
  }

  async verifyPassword(password) {
    const hashedPassword = await this.getPassword();
    if (!hashedPassword) return false;
    
    // First, try to verify as plain password (for backward compatibility with old passwords)
    const isPlainPasswordValid = await bcrypt.compare(password, hashedPassword);
    if (isPlainPasswordValid) {
      // Migrate old password to new format (hash with SHA-256, then bcrypt)
      const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
      const newHash = await bcrypt.hash(sha256Hash, 10);
      await this.run('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)', ['password', newHash]);
      return true;
    }
    
    // Try to verify as SHA-256 hash (new format)
    const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
    return await bcrypt.compare(sha256Hash, hashedPassword);
  }

  async verifyPasswordHash(passwordHash) {
    // Verify SHA-256 hash against bcrypt(SHA-256(password))
    const hashedPassword = await this.getPassword();
    if (!hashedPassword) return false;
    
    // Compare the received SHA-256 hash with the stored bcrypt hash
    return await bcrypt.compare(passwordHash, hashedPassword);
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = Database;
