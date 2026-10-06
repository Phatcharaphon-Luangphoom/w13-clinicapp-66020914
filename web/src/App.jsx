import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function App() {
  const [trainers, setTrainers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState(null);

  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = getTodayString();

  // แปลง "13:28" -> "13:28:00" ให้ SQL Server แปลงเป็นชนิด TIME ได้
  const normalizeTime = (t) => (t && t.length === 5 ? `${t}:00` : t);

  // ดึงค่าวันที่/เวลาจากหลายชื่อ field ที่ Backend อาจส่งมา
  // Backend ส่งวันที่+เวลารวมในฟิลด์ slot -> แปลงเป็น { dateText, timeText }
  const parseSlot = (a) => {
    const raw = a.slot ?? a.appointment_datetime ?? a.datetime ?? null;
    let y, mo, d, h, mi;

    if (typeof raw === 'string') {
      // รองรับ "2026-11-10T13:28:00.000Z", "2026-11-10 13:28:00" ฯลฯ
      const m = raw.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s]+(\d{1,2}):(\d{2}))?/);
      if (m) {
        [, y, mo, d, h, mi] = m;
      }
    } else if (raw) {
      const dt = new Date(raw);
      if (!isNaN(dt)) {
        y = dt.getUTCFullYear();
        mo = dt.getUTCMonth() + 1;
        d = dt.getUTCDate();
        h = dt.getUTCHours();
        mi = dt.getUTCMinutes();
      }
    }

    // fallback ถ้า API ส่งแยก date / time มา
    if (!y && a.date) {
      const m = String(a.date).match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m) [, y, mo, d] = m;
      const t = String(a.time || '').match(/(\d{1,2}):(\d{2})/);
      if (t) [, h, mi] = t;
    }

    if (!y) return { dateText: '', timeText: '', iso: '', hour: null, raw };

    const dateText = new Date(+y, +mo - 1, +d).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const timeText =
      h !== undefined && mi !== undefined
        ? `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
        : '';
    const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hour = h !== undefined && h !== null ? parseInt(h, 10) : null;
    return { dateText, timeText, iso, hour, raw };
  };
  const getTrainerPhone = (a) =>
    a.trainer_phone ?? trainers.find((t) => t.id === a.trainer_id)?.phone ?? '';

  // ===== ตารางเวลาว่างของเทรนเนอร์ (ช่วงละ 1 ชม., เปิด 09:00-21:00) =====
  const OPEN_HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
  const pad2 = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const getBookedHours = (trainerId, iso) =>
    appointments
      .filter((a) => String(a.trainer_id) === String(trainerId))
      .map(parseSlot)
      .filter((p) => p.iso === iso && p.hour !== null)
      .map((p) => p.hour);

  const isPastHour = (iso, h) =>
    iso < today || (iso === today && h <= new Date().getHours());

  const getFreeHours = (trainerId, iso) => {
    const booked = getBookedHours(trainerId, iso);
    return OPEN_HOURS.filter((h) => !booked.includes(h) && !isPastHour(iso, h));
  };

  const availDate = date || today;
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return toISO(d);
  });
  const trainerInForm = trainers.find((t) => String(t.id) === String(selectedTrainer));

  const fetchData = async () => {
    try {
      const resTrainers = await fetch(`${API_BASE}/trainers`);
      if (!resTrainers.ok) throw new Error('database_not_configured');
      const trainersData = await resTrainers.json();
      setTrainers(trainersData);

      const resAppts = await fetch(`${API_BASE}/appointments`);
      if (resAppts.ok) {
        const apptsData = await resAppts.json();
        console.log('appointments จาก API:', apptsData);
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
    if (!selectedTrainer || !clientName || !date || !time) return;

    // ตรวจสอบวันเวลาย้อนหลัง
    const selectedDateTime = new Date(`${date}T${time}`);
    const currentDateTime = new Date();

    if (selectedDateTime < currentDateTime) {
      alert('ไม่สามารถจองวันและเวลาย้อนหลังได้ กรุณาเลือกเวลาใหม่ครับ');
      return;
    }

    const bookHour = parseInt(time.split(':')[0], 10);
    if (!OPEN_HOURS.includes(bookHour)) {
      alert('เปิดให้จองเวลา 09:00 - 21:00 น. เท่านั้นครับ');
      return;
    }
    if (getBookedHours(selectedTrainer, date).includes(bookHour)) {
      alert('เทรนเนอร์ไม่ว่างในช่วงเวลานี้ กรุณาเลือกช่วงเวลาอื่นจากตารางเวลาว่างครับ');
      return;
    }

    try {
      const payload = {
        trainer_id: parseInt(selectedTrainer, 10),
        client_name: clientName.trim(),
        date: date, // YYYY-MM-DD
        time: normalizeTime(time) // HH:mm:ss
      };

      console.log('กำลังส่งข้อมูลไป Backend:', payload);

      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setClientName('');
        setDate('');
        setTime('');
        fetchData();
        alert('จองคิวสำเร็จ!');
      } else {
        const errorText = await res.text();
        console.error('Backend Error Detail:', errorText);
        alert(`บันทึกไม่ได้! เซิร์ฟเวอร์ตอบกลับมาว่า:\n${errorText}`);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
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
          --primary-color: #f97316;
          --primary-hover: #ea580c;
          --primary-light: #ffedd5;
          --danger-color: #ef4444;
          --danger-hover: #dc2626;
          --bg-color: #f8fafc;
          --card-bg: #ffffff;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --border-color: #e2e8f0;
          --dark-bg: #1e293b;
        }
        body {
          margin: 0;
          background-color: var(--bg-color);
          font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .app-container {
          min-height: 100vh;
          padding: 30px 20px;
          max-width: 1200px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .header-banner {
          text-align: center;
          background: linear-gradient(135deg, var(--dark-bg) 0%, #0f172a 100%);
          color: white;
          padding: 32px 24px;
          border-radius: 16px;
          margin-bottom: 30px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          border-bottom: 4px solid var(--primary-color);
        }
        .header-banner h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .header-banner h1 span {
          color: var(--primary-color);
        }
        .header-banner p {
          margin: 8px 0 0 0;
          color: #94a3b8;
          font-size: 15px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 28px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        .card {
          background-color: var(--card-bg);
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          padding: 24px;
          border: 1px solid var(--border-color);
        }
        .sticky-card {
          position: sticky;
          top: 30px;
        }

        .section-title {
          color: var(--text-main);
          font-size: 18px;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 18px;
        }
        .form-group label {
          font-weight: 600;
          color: var(--text-main);
          font-size: 14px;
        }
        .form-control {
          padding: 12px 14px;
          border: 1.5px solid var(--border-color);
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.2s;
          font-family: inherit;
          background-color: #f8fafc;
          color: var(--text-main);
        }
        .form-control:focus {
          outline: none;
          border-color: var(--primary-color);
          background-color: #fff;
          box-shadow: 0 0 0 4px var(--primary-light);
        }
        .btn-submit {
          background-color: var(--primary-color);
          color: white;
          border: none;
          padding: 14px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          margin-top: 8px;
          width: 100%;
        }
        .btn-submit:hover {
          background-color: var(--primary-hover);
        }
        .btn-submit:active {
          transform: scale(0.98);
        }

        .trainer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .trainer-card {
          background-color: #fff;
          border: 1px solid var(--border-color);
          border-left: 4px solid var(--primary-color);
          padding: 16px;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: transform 0.2s;
        }
        .trainer-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .trainer-name {
          font-weight: 700;
          color: var(--text-main);
          font-size: 15px;
        }
        .trainer-spec {
          color: var(--primary-hover);
          font-size: 12px;
          font-weight: 600;
          background-color: var(--primary-light);
          padding: 4px 10px;
          border-radius: 20px;
          display: inline-block;
          width: fit-content;
        }
        .trainer-details {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--text-muted);
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px dashed var(--border-color);
        }

        .appt-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .appt-card {
          background-color: #f8fafc;
          border: 1px solid var(--border-color);
          padding: 16px 20px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
        }
        .appt-card:hover {
          background-color: #fff;
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .appt-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .client-tag {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
        }
        .trainer-tag {
          font-size: 14px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .appt-time {
          font-size: 14px;
          color: var(--primary-hover);
          font-weight: 600;
          background-color: var(--primary-light);
          padding: 4px 10px;
          border-radius: 6px;
          display: inline-block;
          width: fit-content;
          margin-top: 4px;
        }
        .btn-delete {
          background-color: #fff;
          color: var(--danger-color);
          border: 1.5px solid #fecaca;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-delete:hover {
          background-color: var(--danger-color);
          color: white;
          border-color: var(--danger-color);
        }

        .day-strip {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
          margin-bottom: 16px;
        }
        .day-chip {
          flex: 0 0 auto;
          min-width: 84px;
          padding: 10px 12px;
          border: 1.5px solid var(--border-color);
          border-radius: 10px;
          background: #fff;
          cursor: pointer;
          text-align: center;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .day-chip small {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 500;
        }
        .day-chip.active {
          border-color: var(--primary-color);
          background: var(--primary-light);
        }
        .day-chip.full {
          opacity: 0.55;
        }
        .slot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 10px;
        }
        .slot-btn {
          padding: 10px 8px;
          border-radius: 8px;
          border: 1.5px solid #bbf7d0;
          background: #f0fdf4;
          color: #15803d;
          font-weight: 600;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: center;
        }
        .slot-btn small {
          font-size: 11px;
          font-weight: 500;
        }
        .slot-btn.selected {
          background: var(--primary-color);
          border-color: var(--primary-color);
          color: #fff;
        }
        .slot-btn:disabled {
          background: #f1f5f9;
          border-color: var(--border-color);
          color: #94a3b8;
          cursor: not-allowed;
        }
        .slot-note {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0 0 12px 0;
        }
        .empty-text {
          color: var(--text-muted);
          font-style: italic;
          text-align: center;
          padding: 40px 0;
          background-color: #f8fafc;
          border-radius: 10px;
          border: 1px dashed #cbd5e1;
        }
        .error-box {
          background-color: #fef2f2;
          color: #b91c1c;
          padding: 14px 20px;
          border-radius: 10px;
          margin-bottom: 24px;
          font-weight: 500;
          border: 1px solid #fca5a5;
          display: flex;
          align-items: center;
          gap: 10px;
        }
      `}</style>

      {/* Header Banner */}
      <div className="header-banner">
        <h1>🏋️ <span>FitGym</span> Booking</h1>
        <p>ระบบจัดการและจองคิวเทรนเนอร์ส่วนตัว</p>
      </div>

      {error === 'database_not_configured' && (
        <div className="error-box">
          <span>⚠️</span> <strong>ระบบยังไม่ได้เชื่อมต่อฐานข้อมูล:</strong> กรุณาตรวจสอบการตั้งค่า Database
        </div>
      )}

      <div className="dashboard-grid">

        {/* คอลัมน์ซ้าย: ฟอร์มจอง */}
        <div>
          <div className="card sticky-card">
            <h2 className="section-title">📅 นัดหมายเทรนเนอร์</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>เทรนเนอร์ที่ต้องการ</label>
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
                <label>ชื่อผู้รับการฝึก (สมาชิก)</label>
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
                <label>วันที่และเวลา</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    min={today}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <input
                    type="time"
                    className="form-control"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <button type="submit" className="btn-submit">ยืนยันการนัดหมาย</button>
            </form>
          </div>
        </div>

        {/* คอลัมน์ขวา: เทรนเนอร์ & รายการนัดหมาย */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          <div className="card">
            <h2 className="section-title">🗓️ ตารางเวลาว่างของเทรนเนอร์</h2>
            {!trainerInForm ? (
              <p className="empty-text">เลือกเทรนเนอร์ในฟอร์มด้านซ้าย เพื่อดูวันและเวลาที่ว่าง</p>
            ) : (
              <>
                <p className="slot-note">
                  เทรนเนอร์: <strong>{trainerInForm.name}</strong> — เปิดรับ 09:00-21:00 น. ช่วงละ 1 ชม. กดเวลาที่ว่างเพื่อเลือกจอง
                </p>
                <div className="day-strip">
                  {weekDays.map((iso) => {
                    const free = getFreeHours(selectedTrainer, iso).length;
                    const label = new Date(`${iso}T00:00:00`).toLocaleDateString('th-TH', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    });
                    return (
                      <button
                        type="button"
                        key={iso}
                        className={`day-chip${iso === availDate ? ' active' : ''}${free === 0 ? ' full' : ''}`}
                        onClick={() => setDate(iso)}
                      >
                        {label}
                        <small>{free === 0 ? 'เต็ม' : `ว่าง ${free} ช่วง`}</small>
                      </button>
                    );
                  })}
                </div>
                <div className="slot-grid">
                  {OPEN_HOURS.map((h) => {
                    const booked = getBookedHours(selectedTrainer, availDate).includes(h);
                    const past = isPastHour(availDate, h);
                    const selected = date === availDate && time.startsWith(`${pad2(h)}:`);
                    return (
                      <button
                        type="button"
                        key={h}
                        disabled={booked || past}
                        className={`slot-btn${selected ? ' selected' : ''}`}
                        onClick={() => {
                          setDate(availDate);
                          setTime(`${pad2(h)}:00`);
                        }}
                      >
                        {pad2(h)}:00 - {pad2(h + 1)}:00
                        <small>{booked ? 'จองแล้ว' : past ? 'ผ่านไปแล้ว' : 'ว่าง'}</small>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h2 className="section-title">💪 ข้อมูลเทรนเนอร์ผู้เชี่ยวชาญ</h2>
            {trainers.length === 0 ? (
              <p className="empty-text">ยังไม่มีข้อมูลเทรนเนอร์ในระบบ</p>
            ) : (
              <div className="trainer-grid">
                {trainers.map((t) => (
                  <div key={t.id} className="trainer-card">
                    <span className="trainer-name">{t.name}</span>
                    <span className="trainer-spec">{t.specialty}</span>
                    <div className="trainer-details">
                      <span>📞 {t.phone || '-'}</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                        {t.price ? `฿${t.price}/ชม.` : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="section-title">📋 ตารางคิวการฝึกทั้งหมด</h2>
            {appointments.length === 0 ? (
              <p className="empty-text">เวิ้งว้าง... ยังไม่มีคิวจองในขณะนี้</p>
            ) : (
              <div className="appt-list">
                {appointments.map((a) => (
                  <div key={a.id} className="appt-card">
                    <div className="appt-info">
                      <span className="client-tag">👤 {a.client_name}</span>
                      <span className="trainer-tag">
                        <span>🏋️</span> เทรนเนอร์: {a.trainer_name}
                      </span>
                      {getTrainerPhone(a) && (
                        <span className="trainer-tag">
                          <span>📞</span> เบอร์ติดต่อ: {getTrainerPhone(a)}
                        </span>
                      )}
                      <span className="appt-time">
                        🕒 {parseSlot(a).dateText || (parseSlot(a).raw ? String(parseSlot(a).raw) : 'ไม่ระบุวันที่')}
                        {parseSlot(a).timeText ? ` เวลา ${parseSlot(a).timeText} น.` : ''}
                      </span>
                    </div>
                    <button className="btn-delete" onClick={() => handleDelete(a.id)}>
                      ยกเลิกคิว
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
