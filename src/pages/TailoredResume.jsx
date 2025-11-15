import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Textarea'
import { Alert } from '../components/ui/Alert'
import { Loader } from '../components/ui/Loader'

export function TailoredResume() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tailored, setTailored] = useState(null)
  const [job, setJob] = useState(null)
  const [content, setContent] = useState(null)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchTailoredResume()
  }, [id])

  const fetchTailoredResume = async () => {
    try {
      const { data, error } = await supabase
        .from('tailored_resumes')
        .select(`
          *,
          job_posts (id, title, company, location)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      setTailored(data)
      setJob(data.job_posts)
      setContent(data.content)
    } catch (err) {
      console.error('Error fetching tailored resume:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess('')

    try {
      const { error } = await supabase
        .from('tailored_resumes')
        .update({ content })
        .eq('id', id)

      if (error) throw error
      setSuccess('Changes saved!')
    } catch (err) {
      console.error('Error saving:', err)
    } finally {
      setSaving(false)
    }
  }

  const exportToPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default
    const element = document.getElementById('tailored-preview')
    if (!element) return

    const opt = {
      margin: 0.5,
      filename: `${tailored.title.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    }

    html2pdf().set(opt).from(element).save()
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  if (!tailored || !content) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="error">Tailored resume not found</Alert>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Job Info Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Tailored for: {job?.title}
              </h2>
              <p className="text-slate-600">{job?.company}</p>
            </div>
            <Link to={`/jobs/${job?.id}`}>
              <Button variant="secondary" size="sm">
                View Job Details
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {success && <Alert variant="success">{success}</Alert>}

              <Textarea
                label="Headline"
                value={content.headline || ''}
                onChange={(e) => setContent({ ...content, headline: e.target.value })}
                rows={2}
              />

              <Textarea
                label="Summary"
                value={content.summary || ''}
                onChange={(e) => setContent({ ...content, summary: e.target.value })}
                rows={4}
              />

              <div className="flex gap-2">
                <Button onClick={handleSave} loading={saving} className="flex-1">
                  Save Changes
                </Button>
                <Button onClick={exportToPDF} variant="secondary">
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                id="tailored-preview"
                className="bg-white border border-slate-200 rounded-lg p-8 text-sm"
                style={{ minHeight: '600px' }}
              >
                {/* Header */}
                <div className="text-center mb-6 pb-4 border-b border-slate-200">
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    {profile?.full_name || 'Your Name'}
                  </h1>
                  {content.headline && (
                    <p className="text-slate-600 font-medium mb-2">{content.headline}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {[profile?.city, profile?.state].filter(Boolean).join(', ')}
                  </p>
                </div>

                {/* Summary */}
                {content.summary && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                      Summary
                    </h2>
                    <p className="text-slate-700">{content.summary}</p>
                  </div>
                )}

                {/* Experience */}
                {content.experience && content.experience.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">
                      Experience
                    </h2>
                    {content.experience.map((exp, i) => (
                      <div key={i} className="mb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-slate-900">{exp.job_title}</h3>
                            <p className="text-slate-600">{exp.company_name}</p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {exp.start_date && new Date(exp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            {' - '}
                            {exp.is_current
                              ? 'Present'
                              : exp.end_date
                              ? new Date(exp.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                              : ''}
                          </p>
                        </div>
                        {exp.bullet_points && exp.bullet_points.length > 0 && (
                          <ul className="mt-2 space-y-1 list-disc list-inside text-slate-700">
                            {exp.bullet_points.map((bullet, j) => (
                              <li key={j}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills */}
                {content.skills && content.skills.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                      Skills
                    </h2>
                    <p className="text-slate-700">
                      {content.skills.map(s => s.name).join(' • ')}
                    </p>
                  </div>
                )}

                {/* Education */}
                {content.education && content.education.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">
                      Education
                    </h2>
                    {content.education.map((edu, i) => (
                      <div key={i} className="mb-2">
                        <h3 className="font-semibold text-slate-900">{edu.degree}</h3>
                        <p className="text-slate-600">{edu.school_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
