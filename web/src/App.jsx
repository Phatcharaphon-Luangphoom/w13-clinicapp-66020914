import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function App() {
  const [trainers, setTrainers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState(null);
  
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [clientName, setClientName] = useState('');
  const [slot, setSlot] = useState('');

  const fetchData = async () => {
    try {
      const resTrainers = await fetch(`${API_BASE}/trainers`);
      if (!resTrainers.ok) throw new Error('database_not_configured');
      const trainersData = await resTrainers.json();
      setTrainers(trainersData);

      const resAppts = await fetch(`${API_BASE}/appointments`);
      if (resAppts.ok) {
        const apptsData = await resAppts.json();
        setAppointments(apptsData);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrainer || !clientName || !slot) return;

    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: parseInt(selectedTrainer),
          client_name: clientName,
          slot: new Date(slot).toISOString()
        })
      });

      if (res.ok) {
        setClientName('');
        setSlot('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('คุณต้องการลบรายการนัดหมายนี้ใช่หรือไม่?')) return;

    try {
      const res = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      <style>{`
        :root {
          --primary-color: #10b981;
          --primary-hover: #059669;
          --danger-color: #f43f5e;
          --danger-hover: #e11d48;
          --bg-color: #ecfdf5;
          --card-bg: #ffffff;
          --text-main: #064e3b;
          --text-muted: #4b5563;
          --border-color: #d1fae5;
        }
        body {
          margin: 0;
          background-color: var(--bg-color);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .app-container {
          min-height: 100vh;
          padding: 30px 20px;
          max-width: 1100px;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .header-banner {
          text-align: center;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: white;
          padding: 24px;
          border-radius: 16px;
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        .header-banner h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
        }
        .header-banner p {
          margin: 6px 0 0 0;
          opacity: 0.9;
          font-size: 14px;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        .card {
          background-color: var(--card-bg);
          border-radius: 14px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          padding: 24px;
          border: 1px solid var(--border-color);
        }
        .section-title {
          color: var(--text-main);
          font-size: 18px;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 10px;
        }
        .error-box {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 500;
          border: 1px solid #f87171;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }
        .form-group label {
          font-weight: 600;
          color: var(--text-main);
          font-size: 13px;
        }
        .form-control {
          padding: 10px 14px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
          font-family: inherit;
          background-color: #f0fdf4;
          color: var(--text-main);
        }
        .form-control:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }
        .btn-submit {
          background-color: var(--primary-color);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 6px;
        }
        .btn-submit:hover {
          background-color: var(--primary-hover);
        }
        .trainer-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 20px;
        }
        .trainer-badge-card {
          background-color: #f0fdf4;
          border: 1px dashed var(--primary-color);
          padding: 10px 12px;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .trainer-name {
          font-weight: 600;
          color: var(--text-main);
          font-size: 14px;
        }
        .trainer-spec {
          color: var(--primary-hover);
          font-size: 12px;
          font-weight: 600;
          background-color: #d1fae5;
          padding: 3px 8px;
          border-radius: 12px;
        }
        .appt-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .appt-card {
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          padding: 14px 16px;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .appt-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .appt-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .client-tag {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
        }
        .trainer-tag {
          font-size: 13px;
          color: var(--text-muted);
        }
        .appt-time {
          font-size: 12px;
          color: var(--primary-hover);
          font-weight: 600;
          margin-top: 2px;
        }
        .btn-delete {
          background-color: #ffe4e6;
          color: var(--danger-color);
          border: 1px solid #fecdd3;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-delete:hover {
          background-color: var(--danger-color);
          color: white;
        }
        .empty-text {
          color: var(--text-muted);
          font-style: italic;
          text-align: center;
          padding: 30px 0;
        }
      `}</style>

      {/* Header Banner */}
      <div className="header-banner">
        <h1>🏋️ FitGym — Trainer Booking Center</h1>
        <p>ระบบจองเทรนเนอร์ส่วนตัวออนไลน์</p>
      </div>

      {error === 'database_not_configured' && (
        <div className="error-box">
          ⚠️ <strong>Error:</strong> Database is not configured properly.
        </div>
      )}

      {/* 2-Column Dashboard Layout */}
      <div className="dashboard-grid">
        
        {/* คอลัมน์ซ้าย: ฟอร์มจอง + รายชื่อเทรนเนอร์ */}
        <div className="card">
          <h2 className="section-title">📅 จองเทรนเนอร์ส่วนตัว</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="form-group">
              <label>เลือกเทรนเนอร์</label>
              <select className="form-control" value={selectedTrainer} onChange={(e) => setSelectedTrainer(e.target.value)} required>
                <option value="">-- เลือกเทรนเนอร์ --</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.specialty})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>ชื่อลูกค้า / ผู้รับการฝึก</label>
              <input
                type="text"
                className="form-control"
                placeholder="กรอกชื่อ-นามสกุล"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>วันที่และเวลาที่ต้องการฝึก</label>
              <input
                type="datetime-local"
                className="form-control"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-submit">ยืนยันการจอง</button>
          </form>

          {/* รายชื่อเทรนเนอร์ทั้งหมด */}
          <h2 className="section-title" style={{ marginTop: '28px' }}>💪 รายชื่อเทรนเนอร์</h2>
          {trainers.length === 0 ? (
            <p className="empty-text">(ไม่พบข้อมูลเทรนเนอร์)</p>
          ) : (
            <div className="trainer-grid">
              {trainers.map((t) => (
                <div key={t.id} className="trainer-badge-card">
                  <span className="trainer-name">{t.name}</span>
                  <span className="trainer-spec">{t.specialty}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* คอลัมน์ขวา: รายการนัดหมายทั้งหมด */}
        <div className="card">
          <h2 className="section-title">📋 ตารางการนัดหมายทั้งหมด</h2>
          {appointments.length === 0 ? (
            <p className="empty-text">ยังไม่มีรายการนัดหมายในระบบ</p>
          ) : (
            <div className="appt-list">
              {appointments.map((a) => (
                <div key={a.id} className="appt-card">
                  <div className="appt-info">
                    <span className="client-tag">👤 {a.client_name}</span>
                    <span className="trainer-tag">🏋️ เทรนเนอร์: {a.trainer_name}</span>
                    <span className="appt-time">
                      📅 {new Date(a.slot).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <button className="btn-delete" onClick={() => handleDelete(a.id)}>
                    ลบรายการ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
