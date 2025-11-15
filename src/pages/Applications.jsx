import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { EmptyState } from '../components/ui/EmptyState'
import { Loader } from '../components/ui/Loader'
import { Alert } from '../components/ui/Alert'

const STATUS_OPTIONS = [
  { value: 'Applied', label: 'Applied' },
  { value: 'Interview', label: 'Interview' },
  { value: 'Offer', label: 'Offer' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Ghosted', label: 'Ghosted' },
]

const STATUS_COLORS = {
  Applied: 'info',
  Interview: 'success',
  Offer: 'primary',
  Rejected: 'danger',
  Ghosted: 'default',
}

export function Applications() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [jobs, setJobs] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [selectedApp, setSelectedApp] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [newApp, setNewApp] = useState({
    job_post_id: '',
    date_applied: new Date().toISOString().split('T')[0],
    status: 'Applied',
    notes: '',
  })

  useEffect(() => {
    fetchApplications()
    fetchJobs()
  }, [])

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job_posts (id, title, company, location)
        `)
        .eq('user_id', user.id)
        .order('date_applied', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (err) {
      console.error('Error fetching applications:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('job_posts')
      .select('id, title, company')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setJobs(data || [])
  }

  const handleAddApplication = async (e) => {
    e.preventDefault()
    setError('')

    if (!newApp.job_post_id) {
      setError('Please select a job')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.from('applications').insert({
        user_id: user.id,
        job_post_id: newApp.job_post_id,
        date_applied: newApp.date_applied,
        status: newApp.status,
        notes: newApp.notes,
      })

      if (error) throw error

      setShowAddModal(false)
      setNewApp({
        job_post_id: '',
        date_applied: new Date().toISOString().split('T')[0],
        status: 'Applied',
        notes: '',
      })
      fetchApplications()
    } catch (err) {
      setError(err.message || 'Failed to add application')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (appId, newStatus) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', appId)

      if (error) throw error

      setApplications(applications.map(app =>
        app.id === appId ? { ...app, status: newStatus } : app
      ))
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const updateNotes = async () => {
    if (!selectedApp) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('applications')
        .update({ notes: selectedApp.notes })
        .eq('id', selectedApp.id)

      if (error) throw error

      setApplications(applications.map(app =>
        app.id === selectedApp.id ? { ...app, notes: selectedApp.notes } : app
      ))
      setShowNoteModal(false)
    } catch (err) {
      console.error('Error updating notes:', err)
    } finally {
      setSaving(false)
    }
  }

  const groupedApplications = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status.value] = applications.filter(app => app.status === status.value)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
          <p className="text-slate-600">Track your job application pipeline</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          Add Application
        </Button>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              title="No applications yet"
              description="Start tracking your job applications to stay organized"
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              action={
                <Button onClick={() => setShowAddModal(true)}>
                  Log Your First Application
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          {STATUS_OPTIONS.map((status) => (
            <div key={status.value}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-900">{status.label}</h3>
                <Badge variant={STATUS_COLORS[status.value]}>
                  {groupedApplications[status.value]?.length || 0}
                </Badge>
              </div>
              <div className="space-y-3">
                {groupedApplications[status.value]?.map((app) => (
                  <Card key={app.id} className="p-4">
                    <h4 className="font-medium text-slate-900 text-sm mb-1">
                      {app.job_posts?.title}
                    </h4>
                    <p className="text-xs text-slate-600 mb-2">
                      {app.job_posts?.company}
                    </p>
                    <p className="text-xs text-slate-500 mb-3">
                      Applied: {new Date(app.date_applied).toLocaleDateString()}
                    </p>

                    <div className="space-y-2">
                      <Select
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                        options={STATUS_OPTIONS}
                        placeholder=""
                        className="text-xs py-1"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-xs"
                        onClick={() => {
                          setSelectedApp(app)
                          setShowNoteModal(true)
                        }}
                      >
                        {app.notes ? 'View Notes' : 'Add Notes'}
                      </Button>
                    </div>
                  </Card>
                ))}
                {(!groupedApplications[status.value] ||
                  groupedApplications[status.value].length === 0) && (
                  <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-xl">
                    No applications
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Application Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Application"
      >
        <form onSubmit={handleAddApplication} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <Select
            label="Job"
            value={newApp.job_post_id}
            onChange={(e) => setNewApp({ ...newApp, job_post_id: e.target.value })}
            options={jobs.map(job => ({
              value: job.id,
              label: `${job.title} at ${job.company}`,
            }))}
            placeholder="Select a job"
          />

          <Input
            label="Date Applied"
            type="date"
            value={newApp.date_applied}
            onChange={(e) => setNewApp({ ...newApp, date_applied: e.target.value })}
          />

          <Select
            label="Status"
            value={newApp.status}
            onChange={(e) => setNewApp({ ...newApp, status: e.target.value })}
            options={STATUS_OPTIONS}
            placeholder=""
          />

          <Textarea
            label="Notes"
            value={newApp.notes}
            onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })}
            placeholder="Any notes about this application..."
            rows={3}
          />

          <div className="flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">
              Add Application
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Notes Modal */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="Application Notes"
      >
        <div className="space-y-4">
          <Textarea
            value={selectedApp?.notes || ''}
            onChange={(e) => setSelectedApp({ ...selectedApp, notes: e.target.value })}
            placeholder="Add notes about this application..."
            rows={6}
          />
          <div className="flex gap-3">
            <Button onClick={updateNotes} loading={saving} className="flex-1">
              Save Notes
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowNoteModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
