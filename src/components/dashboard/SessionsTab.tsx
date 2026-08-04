'use client'

import type { YouthSession } from '@/types/dashboard'

interface Props {
  sessions: YouthSession[]
}

export default function SessionsTab({ sessions }: Props) {
  const attended = sessions.filter((s) => s.attended).length
  const uniqueSessions = Array.from(new Set(sessions.map((s) => s.session_label)))

  return (
    <>
      <div className="grid grid-3" style={{ marginBottom: '1.4rem' }}>
        <div className="card-state danger">
          <div className="stat-label">参加申込数</div>
          <div className="stat-value">{sessions.length}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}> 名</span></div>
        </div>
        <div className="card-state mint">
          <div className="stat-label">出席者数</div>
          <div className="stat-value">{attended}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}> 名</span></div>
        </div>
        <div className="card-state sky">
          <div className="stat-label">開催回数</div>
          <div className="stat-value">{uniqueSessions.length}<span style={{ fontSize: '0.9rem', fontWeight: 700 }}> 回</span></div>
        </div>
      </div>

      <div className="card-info" style={{ marginBottom: '1.4rem' }}>
        <div className="xp-head">
          <span>出席率</span>
          <span>
            {attended} / {sessions.length} ({sessions.length > 0 ? Math.round((attended / sessions.length) * 100) : 0}%)
          </span>
        </div>
        <div className="xp-track">
          <div
            className="xp-fill mint"
            style={{ width: `${sessions.length > 0 ? (attended / sessions.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="section-title">説明会参加者一覧</div>

      {sessions.length === 0 ? (
        <div className="empty-state">参加者データがありません。</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
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
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className={`badge ${s.attended ? 'grn' : 'gray'}`}>
                      {s.attended ? '出席' : '欠席'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{s.candidate_name}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                    {s.age || '-'}
                  </td>
                  <td>
                    {s.type ? (
                      <span className={`badge ${(s.type ?? '').includes('大学') ? 'blu' : 'gray'}`}>
                        {s.type}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--bd2)', fontSize: '0.75rem' }}>-</span>
                    )}
                  </td>
                  <td>{s.org ?? '-'}</td>
                  <td style={{ fontSize: '0.75rem' }}>{s.session_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
