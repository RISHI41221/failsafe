import React, { useEffect, useState } from 'react'
import { AlertTriangle, BarChart3, ShieldCheck, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { dashboardAPI } from '../lib/api.js'

const PIE_COLORS = ['#fb7185', '#34d399']

const PROBABILITY_BUCKETS = [
  { label: '0-20%', min: 0, max: 0.2 },
  { label: '21-40%', min: 0.2, max: 0.4 },
  { label: '41-60%', min: 0.4, max: 0.6 },
  { label: '61-80%', min: 0.6, max: 0.8 },
  { label: '81-100%', min: 0.8, max: 1.01 },
]

const GLASS_CARD_CLASS =
  'bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl'

function clampProbability(value) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return 0
  }

  return Math.min(Math.max(numericValue, 0), 1)
}

function formatProbability(value) {
  return `${(clampProbability(value) * 100).toFixed(1)}%`
}

function getRiskStatus(prediction) {
  return Number(prediction?.at_risk_prediction) === 1 ? 'At Risk' : 'Safe'
}

function getTopRiskFactor(prediction) {
  const topFactor = Array.isArray(prediction?.top_risk_factors)
    ? prediction.top_risk_factors[0]
    : null

  if (!topFactor) {
    return 'No factor available'
  }

  if (typeof topFactor === 'string') {
    return topFactor
  }

  if (typeof topFactor.feature === 'string' && topFactor.feature.trim()) {
    return topFactor.feature.replaceAll('_', ' ')
  }

  return 'No factor available'
}

function getRecommendedIntervention(prediction) {
  const interventions = Array.isArray(prediction?.recommended_interventions)
    ? prediction.recommended_interventions
    : []

  return interventions[0] ?? 'No intervention recommended'
}

function Dashboard() {
  const [predictions, setPredictions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function fetchPredictions() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await dashboardAPI.getAll()

        if (!isMounted) {
          return
        }

        setPredictions(Array.isArray(data) ? data : [])
      } catch (error) {
        if (!isMounted) {
          return
        }

        const backendMessage = error?.response?.data?.detail
        setErrorMessage(
          typeof backendMessage === 'string' && backendMessage.trim()
            ? backendMessage
            : 'Unable to load dashboard predictions right now.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchPredictions()

    return () => {
      isMounted = false
    }
  }, [])

  const totalStudents = predictions.length
  const studentsAtRisk = predictions.filter(
    (prediction) => Number(prediction.at_risk_prediction) === 1,
  ).length
  const safeStudents = totalStudents - studentsAtRisk

  const pieData = [
    { name: 'At Risk', value: studentsAtRisk },
    { name: 'Safe', value: safeStudents },
  ]

  const probabilityDistribution = PROBABILITY_BUCKETS.map(
    ({ label, min, max }) => ({
      range: label,
      students: predictions.filter((prediction) => {
        const probability = clampProbability(prediction.risk_probability)
        return probability >= min && probability < max
      }).length,
    }),
  )

  const summaryCards = [
    {
      label: 'Total Students',
      value: totalStudents,
      accent:
        'bg-cyan-400/10 text-cyan-200 border border-cyan-400/20 shadow-cyan-950/30',
      icon: Users,
    },
    {
      label: 'Students At Risk',
      value: studentsAtRisk,
      accent:
        'bg-rose-400/10 text-rose-200 border border-rose-400/20 shadow-rose-950/30',
      icon: AlertTriangle,
    },
    {
      label: 'Safe Students',
      value: safeStudents,
      accent:
        'bg-emerald-400/10 text-emerald-200 border border-emerald-400/20 shadow-emerald-950/30',
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-slate-900/80 to-slate-900/95 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
              Dashboard
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-4xl">
              Real-time risk insights for the full student cohort.
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300 lg:text-base">
              Review the current risk mix, inspect probability patterns, and
              prioritize student interventions from one place.
            </p>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {summaryCards.map(({ label, value, accent, icon: Icon }) => (
          <div key={label} className={GLASS_CARD_CLASS}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
              </div>
              <div
                className={`rounded-2xl p-3 shadow-lg ${accent}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={GLASS_CARD_CLASS}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Risk Status Ratio
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Visual balance of at-risk versus safe predictions.
              </p>
            </div>
          </div>

          <div className="mt-6 h-80">
            {isLoading ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-400">
                Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={78}
                    outerRadius={112}
                    paddingAngle={6}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} students`, 'Count']}
                    contentStyle={{
                      backgroundColor: '#020617',
                      border: '1px solid rgba(148, 163, 184, 0.18)',
                      borderRadius: '16px',
                      color: '#e2e8f0',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {pieData.map((item, index) => (
              <div
                key={item.name}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[index] }}
                />
                {item.name}: {item.value}
              </div>
            ))}
          </div>
        </div>

        <div className={GLASS_CARD_CLASS}>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Risk Probability Distribution
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Count of students grouped by prediction confidence.
              </p>
            </div>
          </div>

          <div className="mt-6 h-80">
            {isLoading ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-400">
                Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={probabilityDistribution}>
                  <XAxis
                    dataKey="range"
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} students`, 'Students']}
                    contentStyle={{
                      backgroundColor: '#020617',
                      border: '1px solid rgba(148, 163, 184, 0.18)',
                      borderRadius: '16px',
                      color: '#e2e8f0',
                    }}
                  />
                  <Bar
                    dataKey="students"
                    fill="#38bdf8"
                    radius={[12, 12, 0, 0]}
                    maxBarSize={54}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className={GLASS_CARD_CLASS}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Student Prediction Table
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Current predictions with the most actionable risk signal per
              student.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.22em] text-slate-500">
                <th className="px-4 py-2">Student ID</th>
                <th className="px-4 py-2">Risk Status</th>
                <th className="px-4 py-2">Risk Probability</th>
                <th className="px-4 py-2">Top Risk Factor</th>
                <th className="px-4 py-2">Recommended Intervention</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-400"
                  >
                    Loading student predictions...
                  </td>
                </tr>
              ) : predictions.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-400"
                  >
                    No prediction records are available yet.
                  </td>
                </tr>
              ) : (
                predictions.map((prediction) => {
                  const riskStatus = getRiskStatus(prediction)
                  const isAtRisk = riskStatus === 'At Risk'

                  return (
                    <tr
                      key={`${prediction.student_id}-${prediction.id ?? prediction.risk_probability}`}
                      className="rounded-2xl bg-slate-950/40 text-sm text-slate-200"
                    >
                      <td className="rounded-l-2xl border-y border-l border-white/10 px-4 py-4 font-medium text-white">
                        {prediction.student_id}
                      </td>
                      <td className="border-y border-white/10 px-4 py-4">
                        <span
                          className={[
                            'inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
                            isAtRisk
                              ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                              : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
                          ].join(' ')}
                        >
                          {riskStatus}
                        </span>
                      </td>
                      <td className="border-y border-white/10 px-4 py-4 text-slate-300">
                        {formatProbability(prediction.risk_probability)}
                      </td>
                      <td className="border-y border-white/10 px-4 py-4 capitalize text-slate-300">
                        {getTopRiskFactor(prediction)}
                      </td>
                      <td className="rounded-r-2xl border-y border-r border-white/10 px-4 py-4 text-slate-300">
                        {getRecommendedIntervention(prediction)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
