const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'rocket.db'));
    this.init();
  }

  init() {
    // Enable WAL mode for better concurrent access
    this.db.run('PRAGMA journal_mode = WAL');
    
    // Create tables
    this.db.serialize(() => {
      // Epics table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS epics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          pastille_color TEXT DEFAULT '#FF6B6B',
          position INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tasks table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          epic_id INTEGER NOT NULL,
          content TEXT NOT NULL CHECK(length(content) <= 150),
          position INTEGER NOT NULL,
          is_completed BOOLEAN DEFAULT 0,
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (epic_id) REFERENCES epics (id) ON DELETE CASCADE
        )
      `);

      // Activity log table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          task_id INTEGER,
          details TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL
        )
      `);

      // App config table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS app_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Add completed_at column if it doesn't exist (migration)
      this.db.run(`
        ALTER TABLE tasks ADD COLUMN completed_at DATETIME
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding completed_at column:', err);
        }
      });

      // Create indexes for better performance
      this.db.run('CREATE INDEX IF NOT EXISTS idx_tasks_epic_id ON tasks(epic_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_epics_position ON epics(position)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp)');

      // Insert default epic if none exist
      this.db.get('SELECT COUNT(*) as count FROM epics', (err, row) => {
        if (err) {
          console.error('Error checking epics:', err);
          return;
        }
        if (row.count === 0) {
          this.db.run(`
            INSERT INTO epics (name, pastille_color, position) 
            VALUES ('General', '#FF6B6B', 0)
          `);
        }
      });
    });
  }

  // Epic methods
  getEpics(callback) {
    this.db.all(`
      SELECT * FROM epics 
      ORDER BY position ASC
    `, callback);
  }

  createEpic(name, pastilleColor, position, callback) {
    this.db.run(`
      INSERT INTO epics (name, pastille_color, position) 
      VALUES (?, ?, ?)
    `, [name, pastilleColor, position], function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, this.lastID);
      }
    });
  }

  updateEpic(id, name, pastilleColor, position, callback) {
    this.db.run(`
      UPDATE epics 
      SET name = ?, pastille_color = ?, position = ?
      WHERE id = ?
    `, [name, pastilleColor, position, id], callback);
  }

  deleteEpic(id, callback) {
    this.db.run('DELETE FROM epics WHERE id = ?', [id], callback);
  }

  // Task methods
  getTasks(callback) {
    this.db.all(`
      SELECT t.*, e.name as epic_name, e.pastille_color 
      FROM tasks t 
      JOIN epics e ON t.epic_id = e.id 
      ORDER BY t.epic_id, t.position ASC
    `, callback);
  }

  getTasksByEpic(epicId, callback) {
    this.db.all(`
      SELECT * FROM tasks 
      WHERE epic_id = ? 
      ORDER BY position ASC
    `, [epicId], callback);
  }

  createTask(epicId, content, position, callback) {
    this.db.run(`
      INSERT INTO tasks (epic_id, content, position) 
      VALUES (?, ?, ?)
    `, [epicId, content, position], function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, this.lastID);
      }
    });
  }

  updateTask(id, epicId, content, position, isCompleted, callback) {
    const completedAt = isCompleted ? 'CURRENT_TIMESTAMP' : 'NULL';
    this.db.run(`
      UPDATE tasks 
      SET epic_id = ?, content = ?, position = ?, is_completed = ?, completed_at = ${completedAt}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [epicId, content, position, isCompleted, id], callback);
  }

  updateTaskPosition(id, position, callback) {
    this.db.run(`
      UPDATE tasks 
      SET position = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [position, id], callback);
  }

  deleteTask(id, callback) {
    this.db.run('DELETE FROM tasks WHERE id = ?', [id], callback);
  }

  // Activity log methods
  logActivity(userId, actionType, taskId, details, callback) {
    this.db.run(`
      INSERT INTO activity_log (user_id, action_type, task_id, details) 
      VALUES (?, ?, ?, ?)
    `, [userId, actionType, taskId, details], callback);
  }

  getActivityLog(limit = 50, callback) {
    this.db.all(`
      SELECT al.*, t.content as task_content 
      FROM activity_log al 
      LEFT JOIN tasks t ON al.task_id = t.id 
      ORDER BY al.timestamp DESC 
      LIMIT ?
    `, [limit], callback);
  }

  getCompletedTasks(callback) {
    this.db.all(`
      SELECT t.*, e.name as epic_name
      FROM tasks t
      JOIN epics e ON t.epic_id = e.id
      WHERE t.is_completed = 1
      ORDER BY t.completed_at DESC
    `, callback);
  }

  // Config methods
  getConfig(key, callback) {
    this.db.get('SELECT value FROM app_config WHERE key = ?', [key], (err, row) => {
      if (err) {
        callback(err);
      } else {
        callback(null, row ? row.value : null);
      }
    });
  }

  setConfig(key, value, callback) {
    this.db.run(`
      INSERT OR REPLACE INTO app_config (key, value) 
      VALUES (?, ?)
    `, [key, value], callback);
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
