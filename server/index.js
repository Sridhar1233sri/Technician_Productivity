const express = require('express');
const cors = require('cors');
const db = require('./db');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Login
app.post('/api/login', async (req, res) => {
  const { username } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(401).json({ error: 'User not found. Please ask an Admin to create your account.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Create user
app.post('/api/users', async (req, res) => {
  const { username, name, role } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO users (username, name, role) VALUES ($1, $2, $3) RETURNING *',
      [username, name, role || 'TECHNICIAN']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start a job
app.post('/api/jobs/start', async (req, res) => {
  const { user_id, ro_number, reg_number } = req.body;
  try {
    // Check if user already has an ACTIVE job
    const activeCheck = await db.query(
      'SELECT id FROM jobs WHERE user_id = $1 AND status = $2',
      [user_id, 'ACTIVE']
    );
    if (activeCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You must pause your current active job before starting a new one.' });
    }

    const result = await db.query(
      'INSERT INTO jobs (user_id, ro_number, reg_number) VALUES ($1, $2, $3) RETURNING *',
      [user_id, ro_number, reg_number]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get active jobs for user (could be ACTIVE or PAUSED)
app.get('/api/jobs/active/:userId', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM jobs WHERE user_id = $1 AND status IN ('ACTIVE', 'PAUSED') ORDER BY start_time DESC",
      [req.params.userId]
    );

    const jobs = await Promise.all(result.rows.map(async (job) => {
      if (job.status === 'PAUSED') {
        const pauseRes = await db.query(
          'SELECT reason FROM job_pauses WHERE job_id = $1 AND end_time IS NULL',
          [job.id]
        );
        if (pauseRes.rows.length > 0) {
          job.pause_reason = pauseRes.rows[0].reason;
        }
      }
      return job;
    }));

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pause a job
app.post('/api/jobs/pause/:jobId', async (req, res) => {
  const { reason } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE jobs SET status = $1 WHERE id = $2', ['PAUSED', req.params.jobId]);
    await client.query('INSERT INTO job_pauses (job_id, reason) VALUES ($1, $2)', [req.params.jobId, reason]);
    await client.query('COMMIT');

    // Fetch updated job
    const result = await db.query('SELECT * FROM jobs WHERE id = $1', [req.params.jobId]);
    const job = result.rows[0];
    job.pause_reason = reason;
    res.json(job);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Resume a job
app.post('/api/jobs/resume/:jobId', async (req, res) => {
  const client = await db.getClient();
  try {
    // Verify the job belongs to someone, and they don't have an ACTIVE job
    const jobRes = await db.query('SELECT user_id FROM jobs WHERE id = $1', [req.params.jobId]);
    if (jobRes.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    const user_id = jobRes.rows[0].user_id;

    const activeCheck = await db.query(
      'SELECT id FROM jobs WHERE user_id = $1 AND status = $2',
      [user_id, 'ACTIVE']
    );
    if (activeCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You must pause your current active job before resuming another one.' });
    }

    await client.query('BEGIN');
    await client.query('UPDATE jobs SET status = $1 WHERE id = $2', ['ACTIVE', req.params.jobId]);
    // Close the open pause record
    await client.query(
      'UPDATE job_pauses SET end_time = NOW() WHERE job_id = $1 AND end_time IS NULL',
      [req.params.jobId]
    );
    await client.query('COMMIT');

    const result = await db.query('SELECT * FROM jobs WHERE id = $1', [req.params.jobId]);
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Stop a job
app.post('/api/jobs/stop/:jobId', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    // Ensure any active pause is closed
    await client.query(
      'UPDATE job_pauses SET end_time = NOW() WHERE job_id = $1 AND end_time IS NULL',
      [req.params.jobId]
    );
    // Close the job
    const result = await client.query(
      'UPDATE jobs SET end_time = NOW(), status = $1 WHERE id = $2 RETURNING *',
      ['COMPLETED', req.params.jobId]
    );
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get completed jobs for user (history/summary)
app.get('/api/jobs/history/:userId', async (req, res) => {
  try {
    const query = `
      SELECT j.*,
             EXTRACT(EPOCH FROM (j.end_time - j.start_time))::INTEGER AS total_sec,
             COALESCE((
               SELECT SUM(EXTRACT(EPOCH FROM (p.end_time - p.start_time))::INTEGER)
               FROM job_pauses p
               WHERE p.job_id = j.id
             ), 0) AS paused_sec,
             COALESCE((
               SELECT json_agg(
                 json_build_object(
                   'id', p.id,
                   'reason', p.reason,
                   'start_time', p.start_time,
                   'end_time', p.end_time,
                   'duration_sec', EXTRACT(EPOCH FROM (p.end_time - p.start_time))::INTEGER
                 )
               )
               FROM job_pauses p
               WHERE p.job_id = j.id AND p.end_time IS NOT NULL
             ), '[]'::json) AS pauses
      FROM jobs j
      WHERE j.user_id = $1 AND j.status = $2
      ORDER BY j.end_time DESC
    `;
    const result = await db.query(query, [req.params.userId, 'COMPLETED']);

    const processedRows = result.rows.map(row => {
      const netSec = row.total_sec - row.paused_sec;
      let parsedPauses = [];
      try {
        parsedPauses = typeof row.pauses === 'string' ? JSON.parse(row.pauses) : (row.pauses || []);
      } catch (e) {
        // ignore parse error
      }
      return {
        ...row,
        pauses: parsedPauses,
        duration_hours: Math.max(0, netSec) / 3600,
        paused_hours: parseFloat(row.paused_sec) / 3600
      };
    });

    res.json(processedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user summary
app.get('/api/users/summary/:userId', async (req, res) => {
  try {
    const query = `
      SELECT
        SUM(EXTRACT(EPOCH FROM (j.end_time - j.start_time))::INTEGER) AS total_gross_sec,
        SUM(COALESCE((
          SELECT SUM(EXTRACT(EPOCH FROM (p.end_time - p.start_time))::INTEGER)
          FROM job_pauses p
          WHERE p.job_id = j.id
        ), 0)) AS total_paused_sec
      FROM jobs j
      WHERE j.user_id = $1 AND j.status = $2
    `;
    const result = await db.query(query, [req.params.userId, 'COMPLETED']);

    if (result.rows.length > 0 && result.rows[0].total_gross_sec !== null) {
      const row = result.rows[0];
      const grossSec = parseFloat(row.total_gross_sec) || 0;
      const pausedSec = parseFloat(row.total_paused_sec) || 0;
      const netSec = Math.max(0, grossSec - pausedSec);

      res.json({
        total_production_hours: netSec / 3600,
        total_paused_hours: pausedSec / 3600
      });
    } else {
      res.json({
        total_production_hours: 0,
        total_paused_hours: 0
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get productivity report for Supervisor
app.get('/api/reports/productivity', async (req, res) => {
  try {
    const { period } = req.query; // 'daily', 'weekly', 'monthly'
    let dateFilter = "DATE(j.end_time) = CURRENT_DATE"; // default daily

    if (period === 'weekly') {
      dateFilter = "DATE(j.end_time) >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'monthly') {
      dateFilter = "DATE(j.end_time) >= DATE_TRUNC('month', CURRENT_DATE)";
    }

    const query = `
      SELECT
        u.username   AS emp_id,
        u.name,
        COUNT(j.id)  AS total_jobs,
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (j.end_time - j.start_time))::INTEGER
        ), 0) AS gross_sec,
        COALESCE(SUM((
          SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (p.end_time - p.start_time))::INTEGER), 0)
          FROM job_pauses p
          WHERE p.job_id = j.id AND p.end_time IS NOT NULL
        )), 0) AS paused_sec
      FROM users u
      LEFT JOIN jobs j
        ON j.user_id = u.id
        AND j.status = 'COMPLETED'
        AND ${dateFilter}
      WHERE u.role = 'TECHNICIAN'
      GROUP BY u.id, u.username, u.name
      ORDER BY u.name
    `;
    const result = await db.query(query);

    const rows = result.rows.map(row => {
      const gross  = parseFloat(row.gross_sec)  || 0;
      const paused = parseFloat(row.paused_sec) || 0;
      const net    = Math.max(0, gross - paused);
      return {
        emp_id:                 row.emp_id,
        name:                   row.name,
        total_jobs:             parseInt(row.total_jobs, 10),
        total_production_hours: net    / 3600,
        total_break_hours:      paused / 3600,
      };
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications: Get recent notifications for user
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM notifications WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at DESC",
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications: Mark as read
app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// CRON JOB: Daily productivity check at 7:00 PM on weekdays
cron.schedule('0 19 * * 1-5', async () => {
  console.log('Running daily productivity check...');

  const currentDay = new Date().getDay();
  if (currentDay === 0 || currentDay === 6) {
    console.log('Weekend detected, skipping productivity check.');
    return;
  }

  try {
    // 1. Fetch supervisors
    const supRes = await db.query("SELECT id FROM users WHERE role = 'SUPERVISOR'");
    const supervisorIds = supRes.rows.map(r => r.id);

    // 2. Fetch today's productivity for all technicians
    const query = `
      SELECT
        u.id         AS user_id,
        u.name,
        COUNT(j.id)  AS total_jobs,
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (j.end_time - j.start_time))::INTEGER
        ), 0) AS gross_sec,
        COALESCE(SUM((
          SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (p.end_time - p.start_time))::INTEGER), 0)
          FROM job_pauses p
          WHERE p.job_id = j.id AND p.end_time IS NOT NULL
        )), 0) AS paused_sec
      FROM users u
      LEFT JOIN jobs j
        ON j.user_id = u.id
        AND j.status = 'COMPLETED'
        AND DATE(j.end_time) = CURRENT_DATE
      WHERE u.role = 'TECHNICIAN'
      GROUP BY u.id, u.name
    `;

    const prodRes = await db.query(query);

    for (const row of prodRes.rows) {
      const gross     = parseFloat(row.gross_sec)  || 0;
      const paused    = parseFloat(row.paused_sec) || 0;
      const netHours  = Math.max(0, gross - paused) / 3600;
      const totalJobs = parseInt(row.total_jobs, 10);

      if (totalJobs === 0 && netHours === 0) {
        // Did not work today — notify supervisors
        for (const supId of supervisorIds) {
          await db.query(
            "INSERT INTO notifications (user_id, message) VALUES ($1, $2)",
            [supId, `Technician ${row.name} logged 0 hours today. They might be on leave.`]
          );
        }
      } else if (netHours < 6) {
        // Low productivity — notify technician
        await db.query(
          "INSERT INTO notifications (user_id, message) VALUES ($1, $2)",
          [row.user_id, `Your production today was under 6 hours (${netHours.toFixed(1)} hrs). Please ensure you are meeting the required level.`]
        );
        // Notify supervisors
        for (const supId of supervisorIds) {
          await db.query(
            "INSERT INTO notifications (user_id, message) VALUES ($1, $2)",
            [supId, `Technician ${row.name} had low productivity today (${netHours.toFixed(1)} hrs).`]
          );
        }
      }
    }

    console.log('Daily productivity check completed successfully.');
  } catch (err) {
    console.error('Error during daily productivity check:', err);
  }
});
