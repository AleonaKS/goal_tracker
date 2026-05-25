import { useState, useRef } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { Modal } from './Modal'
import { useApiDataStore } from '@/stores/apiDataStore'
import { parseImportData, validateImportData, prepareImportData, type ImportResult } from '@/lib/exportData'
import { cn } from '@/lib/utils'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { user, createCategory, createGoal, createStage, createTask, createSubtask, createMetric, createMetricEntry } = useApiDataStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/json') {
      setResult({
        success: false,
        message: 'Please select a JSON file',
        imported: { categories: 0, goals: 0, stages: 0, tasks: 0, subtasks: 0, metrics: 0, metricEntries: 0 },
        errors: ['Invalid file type. Only JSON files are supported.']
      })
      return
    }
    
    setSelectedFile(file)
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const processFile = async () => {
    if (!selectedFile || !user) return

    setIsProcessing(true)
    setResult(null)

    try {
      // Чтение и разбор файла
      const fileContent = await selectedFile.text()
      const { data, errors: parseErrors } = parseImportData(fileContent)

      if (parseErrors.length > 0 || !data) {
        setResult({
          success: false,
          message: 'Failed to parse file',
          imported: { categories: 0, goals: 0, stages: 0, tasks: 0, subtasks: 0, metrics: 0, metricEntries: 0 },
          errors: parseErrors
        })
        return
      }

      // Валидация данных
      const validation = validateImportData(data)
      if (!validation.isValid) {
        setResult({
          success: false,
          message: 'Invalid data format',
          imported: { categories: 0, goals: 0, stages: 0, tasks: 0, subtasks: 0, metrics: 0, metricEntries: 0 },
          errors: validation.errors,
          warnings: validation.warnings
        })
        return
      }

      // Подготовка данных для импорта (генерация новых ID)
      const preparedData = prepareImportData(data, user.id)

      // Импорт данных в правильном порядке
      const imported = {
        categories: 0,
        goals: 0,
        stages: 0,
        tasks: 0,
        subtasks: 0,
        metrics: 0,
        metricEntries: 0
      }

      const errors: string[] = []
      const warnings = validation.warnings || []

      try {
        // Импорт категорий первыми
        for (const category of preparedData.categories) {
          try {
            await createCategory(category)
            imported.categories++
          } catch (error) {
            errors.push(`Failed to import category "${category.name}": ${error}`)
          }
        }

        // Импорт целей
        for (const goal of preparedData.goals) {
          try {
            await createGoal(goal)
            imported.goals++
          } catch (error) {
            errors.push(`Failed to import goal "${goal.name}": ${error}`)
          }
        }

        // Импорт этапов
        for (const stage of preparedData.stages) {
          try {
            await createStage(stage)
            imported.stages++
          } catch (error) {
            errors.push(`Failed to import stage "${stage.name}": ${error}`)
          }
        }

        // Импорт задач
        for (const task of preparedData.tasks) {
          try {
            await createTask(task)
            imported.tasks++
          } catch (error) {
            errors.push(`Failed to import task "${task.name}": ${error}`)
          }
        }

        // Импорт подзадач
        for (const subtask of preparedData.subtasks) {
          try {
            await createSubtask(subtask)
            imported.subtasks++
          } catch (error) {
            errors.push(`Failed to import subtask "${subtask.title}": ${error}`)
          }
        }

        // Импорт метрик
        for (const metric of preparedData.metrics) {
          try {
            await createMetric(metric)
            imported.metrics++
          } catch (error) {
            errors.push(`Failed to import metric "${metric.name}": ${error}`)
          }
        }

        // Импорт записей метрик
        for (const entry of preparedData.metricEntries) {
          try {
            await createMetricEntry(entry)
            imported.metricEntries++
          } catch (error) {
            errors.push(`Failed to import metric entry: ${error}`)
          }
        }

        setResult({
          success: errors.length === 0,
          message: errors.length === 0 
            ? 'Data imported successfully!' 
            : `Import completed with ${errors.length} errors`,
          imported,
          errors: errors.length > 0 ? errors : undefined,
          warnings: warnings.length > 0 ? warnings : undefined
        })

      } catch (error) {
        setResult({
          success: false,
          message: 'Import failed during processing',
          imported,
          errors: [`Unexpected error: ${error}`]
        })
      }

    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to process file',
        imported: { categories: 0, goals: 0, stages: 0, tasks: 0, subtasks: 0, metrics: 0, metricEntries: 0 },
        errors: [`File processing error: ${error}`]
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const reset = () => {
    setSelectedFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Data">
      <div className="space-y-4">
        {!result && (
          <>
            {/* File upload area */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
                'hover:border-gray-400'
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop your JSON file here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Select File
              </button>
            </div>

            {/* Selected file info */}
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={processFile}
                disabled={!selectedFile || isProcessing}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </>
        )}

        {/* Result display */}
        {result && (
          <div className="space-y-4">
            <div className={cn(
              'flex items-center gap-3 p-4 rounded-lg',
              result.success ? 'bg-green-50' : 'bg-red-50'
            )}>
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className={cn(
                  'font-medium',
                  result.success ? 'text-green-900' : 'text-red-900'
                )}>
                  {result.message}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Imported: {result.imported.categories} categories, {result.imported.goals} goals, {result.imported.tasks} tasks, {result.imported.metrics} metrics
                </p>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="font-medium text-amber-900 mb-2">Warnings:</p>
                <ul className="text-sm text-amber-800 space-y-1">
                  {result.warnings.map((warning, index) => (
                    <li key={index}>· {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="font-medium text-red-900 mb-2">Errors:</p>
                <ul className="text-sm text-red-800 space-y-1">
                  {result.errors.map((error, index) => (
                    <li key={index}>· {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
