'use client'

import type { SessionRecord } from '@/types/dashboard'

interface Props {
  sessions: SessionRecord[]
}

export default function SessionsTab({ sessions }: Props) {
  const attended = sessions.filter((s) => s.attended).length
  const uniqueSessions = Array.from(new Set(sessions.map((s) => s.session)))

  return (
    <>
      <div className="kpi-row">
        <div className="kpi-card red">
          <div className="kpi-label">参加申込数</div>
          <div className="kpi-value">
            {sessions.length}
            <span> 名</span>
          </div>
        </div>
        <div className="kpi-card grn">
          <div className="kpi-label">出席者数</div>
          <div className="kpi-value">
            {attended}
            <span> 名</span>
          </div>
        </div>
        <div className="kpi-card blu">
          <div className="kpi-label">開催回数</div>
          <div className="kpi-value">
            {uniqueSessions.length}
            <span> 回</span>
          </div>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-label">
          <span>出席率</span>
          <span>
            {attended} / {sessions.length} ({Math.round((attended / sessions.length) * 100)}%)
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill grn"
            style={{ width: `${(attended / sessions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="section-title">説明会参加者一覧</div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>出席</th>
              <th>氏名</th>
              <th>年齢</th>
              <th>区分</th>
              <th>所属</th>
              <th>セッション</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={i}>
                <td>
                  <span className={`chk ${s.attended ? 'ok' : 'ng'}`}>
                    {s.attended ? '\u2713' : '\u2715'}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                  {s.age || '-'}
                </td>
                <td>
                  {s.type ? (
                    <span className={`badge ${s.type.includes('大学') ? 'blu' : 'gray'}`}>
                      {s.type}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--bd2)', fontSize: '0.75rem' }}>-</span>
                  )}
                </td>
                <td>{s.org}</td>
                <td style={{ fontSize: '0.75rem' }}>{s.session}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
