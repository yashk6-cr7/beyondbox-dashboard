import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SKILL_COLORS = {
  Cognitive:        '#6366f1',
  Creative:         '#ec4899',
  Communication:    '#f59e0b',
  'Social-Emotional': '#10b981',
  Physical:         '#ef4444',
  Practical:        '#8b5cf6',
};

function buildChartData(books) {
  if (!books?.length) return [];
  return books.map(b => ({
    name:               b.shortTitle,
    Cognitive:          b.cognitive,
    Creative:           b.creative,
    Communication:      b.communication,
    'Social-Emotional': b.socialEmotional,
    Physical:           b.physical,
    Practical:          b.practical,
  }));
}

function CustomLegend({ payload }) {
  return (
    <div className="chart-legend">
      {(payload ?? []).map(entry => (
        <span key={entry.value} className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  );
}

export default function SkillGrowthChart({ student }) {
  const books = student?.books || [];
  const chartData = buildChartData(books);

  if (books.length === 0) {
    return (
      <div className="card skill-growth-card" id="skill-growth-chart" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center', minHeight: '200px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
        <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>No scores yet</h3>
        <p className="card-subtitle" style={{ margin: 0 }}>Your tutor will add scores after each book.</p>
      </div>
    );
  }

  return (
    <div className="card skill-growth-card" id="skill-growth-chart">
      <h3 className="card-title">📈 Skill Growth Across Books</h3>
      <p className="card-subtitle">Each line shows how a skill grew across every completed book (max score: 4)</p>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
            <YAxis
              domain={[0, 4]}
              ticks={[0, 1, 2, 3, 4]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              label={{ value: 'Score (/5)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#9ca3af' } }}
            />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }} />
            <Legend content={<CustomLegend />} />
            {Object.entries(SKILL_COLORS).map(([skill, color]) => (
              <Line key={skill} type="monotone" dataKey={skill} stroke={color} strokeWidth={2.5}
                dot={{ r: 4, fill: color, strokeWidth: 0 }} activeDot={{ r: 6, fill: color, strokeWidth: 0 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
