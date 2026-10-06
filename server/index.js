import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getPool } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// 1. Health Check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Trainer API is running' });
});

// 2. GET /trainers
app.get('/trainers', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT id, name, specialty, phone, price FROM trainers ORDER BY id ASC');
    res.json(result.recordset);
  } catch (err) {
    if (err.message === 'database_not_configured') {
      return res.status(500).json({ error: 'database_not_configured' });
    }
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /appointments
app.get('/appointments', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT a.id, a.trainer_id, t.name AS trainer_name, t.specialty, a.client_name, a.slot, a.created
      FROM appointments a
      JOIN trainers t ON a.trainer_id = t.id
      ORDER BY a.slot DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    if (err.message === 'database_not_configured') {
      return res.status(500).json({ error: 'database_not_configured' });
    }
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /appointments
app.post('/appointments', async (req, res) => {
  // รับค่า date และ time แยกกันจากที่ Frontend ส่งมา
  const { trainer_id, client_name, date, time } = req.body;
  
  if (!trainer_id || !client_name || !date || !time) {
    return res.status(400).json({ error: 'Missing required fields: trainer_id, client_name, date, time' });
  }

  // นำวันที่และเวลามารวมกันให้อยู่ในรูปแบบที่ SQL Server เข้าใจ (เช่น 2023-12-31T14:30)
  const slot = `${date}T${time}`;

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('trainer_id', trainer_id);
    request.input('client_name', client_name);
    request.input('slot', slot); // บันทึก slot ที่รวมแล้วลง Database

    await request.query(`
      INSERT INTO appointments (trainer_id, client_name, slot)
      VALUES (@trainer_id, @client_name, @slot)
    `);

    res.status(201).json({ message: 'Trainer appointment created successfully' });
  } catch (err) {
    if (err.message === 'database_not_configured') {
      return res.status(500).json({ error: 'database_not_configured' });
    }
    res.status(500).json({ error: err.message });
  }
});

// 5. DELETE /appointments/:id - ลบการนัดหมาย
app.delete('/appointments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('id', id);

    const result = await request.query('DELETE FROM appointments WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    if (err.message === 'database_not_configured') {
      return res.status(500).json({ error: 'database_not_configured' });
    }
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`trainer-api listening on :${PORT}`);
});