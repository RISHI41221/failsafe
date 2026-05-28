import React, { useRef, useState } from 'react'
import {
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCcw,
  UploadCloud,
} from 'lucide-react'
import { predictAPI } from '../lib/api.js'

const GLASS_CARD_CLASS =
  'bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl'

function formatProbability(value) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return '0.0%'
  }

  return `${(Math.min(Math.max(numericValue, 0), 1) * 100).toFixed(1)}%`
}

function getUploadErrorMessage(error) {
  const backendMessage = error?.response?.data?.detail

  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage
  }

  return 'The CSV upload failed. Please verify the file format and try again.'
}

function Upload() {
  const inputRef = useRef(null)
  const progressTimerRef = useRef(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [results, setResults] = useState(null)

  const totalProcessed = Array.isArray(results) ? results.length : 0
  const atRiskCount = Array.isArray(results)
    ? results.filter((prediction) => Number(prediction.at_risk_prediction) === 1)
        .length
    : 0
  const safeCount = totalProcessed - atRiskCount

  function stopProgressSimulation() {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }

  function startProgressSimulation() {
    stopProgressSimulation()
    setUploadProgress(10)

    progressTimerRef.current = window.setInterval(() => {
      setUploadProgress((currentProgress) => {
        if (currentProgress >= 92) {
          return currentProgress
        }

        return currentProgress < 60
          ? currentProgress + 8
          : currentProgress + 3
      })
    }, 240)
  }

  function resetUploadState() {
    stopProgressSimulation()
    setIsDragging(false)
    setIsUploading(false)
    setUploadProgress(0)
    setSelectedFileName('')
    setErrorMessage('')
    setResults(null)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  async function uploadFile(file) {
    if (!file) {
      return
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Please upload a valid .csv file.')
      return
    }

    setErrorMessage('')
    setSelectedFileName(file.name)
    setIsUploading(true)
    startProgressSimulation()

    try {
      const uploadedResults = await predictAPI.uploadCSV(file)
      stopProgressSimulation()
      setUploadProgress(100)
      setResults(Array.isArray(uploadedResults) ? uploadedResults : [])
    } catch (error) {
      stopProgressSimulation()
      setUploadProgress(0)
      setErrorMessage(getUploadErrorMessage(error))
    } finally {
      setIsUploading(false)
    }
  }

  function handleDragOver(event) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(event) {
    event.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)

    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      uploadFile(droppedFile)
    }
  }

  function handleFileInputChange(event) {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      uploadFile(selectedFile)
    }
  }

  function openFilePicker() {
    inputRef.current?.click()
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-slate-900/80 to-slate-900/95 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
            Batch Upload
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-4xl">
            Submit a student CSV and turn the batch into actionable results.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300 lg:text-base">
            Drag in a file, send it to the FAILSAFE prediction service, and
            review the resulting risk factors and intervention recommendations
            immediately.
          </p>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      {results === null ? (
        <section className={GLASS_CARD_CLASS}>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={[
              'rounded-3xl border-2 border-dashed p-8 text-center transition',
              isDragging
                ? 'border-cyan-300 bg-cyan-400/10'
                : 'border-white/10 bg-slate-950/35',
            ].join(' ')}
          >
            <div className="mx-auto flex max-w-2xl flex-col items-center">
              <div className="rounded-3xl bg-cyan-400/10 p-4 text-cyan-200">
                {isUploading ? (
                  <LoaderCircle className="h-8 w-8 animate-spin" />
                ) : (
                  <UploadCloud className="h-8 w-8" />
                )}
              </div>

              <h2 className="mt-6 text-2xl font-semibold text-white">
                {isUploading ? 'Uploading and scoring your batch...' : 'Drop your CSV file here'}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
                {isUploading
                  ? 'The model is processing the uploaded student records and preparing interventions.'
                  : 'Use drag and drop or browse from your device. Only .csv files are accepted.'}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Choose CSV File
                </button>
                <span className="text-sm text-slate-500">
                  {selectedFileName || 'No file selected yet'}
                </span>
              </div>

              {isUploading ? (
                <div className="mt-8 w-full max-w-xl">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span>Upload Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-cyan-400 to-emerald-300 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-8">
          <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-400">
                Uploaded file: <span className="text-slate-200">{selectedFileName}</span>
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Batch processing complete
              </h2>
            </div>

            <button
              type="button"
              onClick={resetUploadState}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
            >
              <RefreshCcw className="h-4 w-4" />
              Upload Another File
            </button>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: 'Total Processed',
                value: totalProcessed,
                accent:
                  'bg-cyan-400/10 text-cyan-200 border border-cyan-400/20',
              },
              {
                label: 'At Risk Count',
                value: atRiskCount,
                accent:
                  'bg-rose-400/10 text-rose-200 border border-rose-400/20',
              },
              {
                label: 'Safe Count',
                value: safeCount,
                accent:
                  'bg-emerald-400/10 text-emerald-200 border border-emerald-400/20',
              },
            ].map((card) => (
              <div key={card.label} className={GLASS_CARD_CLASS}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">{card.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {card.value}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-3 ${card.accent}`}>
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className={GLASS_CARD_CLASS}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Uploaded Batch Results
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  SHAP-driven risk factors and generated interventions for every
                  processed student record.
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.22em] text-slate-500">
                    <th className="px-4 py-2">Student ID</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Risk Probability</th>
                    <th className="px-4 py-2">Top Risk Factors</th>
                    <th className="px-4 py-2">Interventions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-400"
                      >
                        The upload completed, but no student rows were returned.
                      </td>
                    </tr>
                  ) : (
                    results.map((prediction) => {
                      const isAtRisk =
                        Number(prediction.at_risk_prediction) === 1

                      return (
                        <tr
                          key={`${prediction.student_id}-${prediction.risk_probability}`}
                          className="bg-slate-950/40 text-sm text-slate-200"
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
                              {isAtRisk ? 'At Risk' : 'Safe'}
                            </span>
                          </td>
                          <td className="border-y border-white/10 px-4 py-4 text-slate-300">
                            {formatProbability(prediction.risk_probability)}
                          </td>
                          <td className="border-y border-white/10 px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              {(Array.isArray(prediction.top_risk_factors)
                                ? prediction.top_risk_factors
                                : []
                              ).map((factor, index) => {
                                const label =
                                  typeof factor === 'string'
                                    ? factor
                                    : factor?.feature ?? `Factor ${index + 1}`

                                return (
                                  <span
                                    key={`${prediction.student_id}-${label}-${index}`}
                                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                                  >
                                    {String(label).replaceAll('_', ' ')}
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                          <td className="rounded-r-2xl border-y border-r border-white/10 px-4 py-4 text-slate-300">
                            <div className="space-y-2">
                              {(Array.isArray(prediction.recommended_interventions)
                                ? prediction.recommended_interventions
                                : []
                              ).map((intervention, index) => (
                                <p
                                  key={`${prediction.student_id}-intervention-${index}`}
                                  className="rounded-2xl bg-white/[0.03] px-3 py-2 leading-6"
                                >
                                  {intervention}
                                </p>
                              ))}
                            </div>
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
      )}
    </div>
  )
}

export default Upload
