import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Chip } from '../components/ui/Chip'
import { Loader } from '../components/ui/Loader'

export function ResumeBuilder() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [resume, setResume] = useState({
    name: 'My Resume',
    headline: '',
    summary: '',
  })

  const [experiences, setExperiences] = useState([])
  const [education, setEducation] = useState([])
  const [skills, setSkills] = useState([])
  const [newSkill, setNewSkill] = useState('')

  useEffect(() => {
    if (id && id !== 'new') {
      fetchResumeData()
    } else {
      fetchProfileData()
    }
  }, [id])

  const fetchResumeData = async () => {
    try {
      const { data: resumeData, error: resumeError } = await supabase
        .from('resume_profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (resumeError) throw resumeError

      setResume({
        name: resumeData.name,
        headline: resumeData.headline || '',
        summary: resumeData.summary || '',
      })

      await fetchProfileData()
    } catch (err) {
      console.error('Error fetching resume:', err)
      setError('Failed to load resume')
    }
  }

  const fetchProfileData = async () => {
    try {
      const { data: expData } = await supabase
        .from('experiences')
        .select('*')
        .eq('profile_id', profile.id)
        .order('start_date', { ascending: false })

      const { data: eduData } = await supabase
        .from('education')
        .select('*')
        .eq('profile_id', profile.id)
        .order('end_date', { ascending: false })

      const { data: skillsData } = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', profile.id)

      setExperiences(expData || [])
      setEducation(eduData || [])
      setSkills(skillsData || [])
    } catch (err) {
      console.error('Error fetching profile data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (id && id !== 'new') {
        // Update existing resume
        const { error } = await supabase
          .from('resume_profiles')
          .update({
            name: resume.name,
            headline: resume.headline,
            summary: resume.summary,
          })
          .eq('id', id)

        if (error) throw error
      } else {
        // Create new resume
        const { data, error } = await supabase
          .from('resume_profiles')
          .insert({
            profile_id: profile.id,
            name: resume.name,
            headline: resume.headline,
            summary: resume.summary,
          })
          .select()
          .single()

        if (error) throw error
        navigate(`/resume/${data.id}`, { replace: true })
      }

      setSuccess('Resume saved successfully!')
    } catch (err) {
      setError(err.message || 'Failed to save resume')
    } finally {
      setSaving(false)
    }
  }

  const generateBulletPoints = (exp) => {
    // Simple bullet point generator based on job title and description
    const actionVerbs = ['Managed', 'Developed', 'Implemented', 'Led', 'Created', 'Improved', 'Achieved', 'Coordinated']
    const bullets = []

    if (exp.description_raw) {
      const sentences = exp.description_raw.split('.').filter(s => s.trim())
      sentences.forEach((sentence, i) => {
        if (i < 3) {
          const verb = actionVerbs[i % actionVerbs.length]
          bullets.push(`${verb} ${sentence.trim().toLowerCase()}`)
        }
      })
    }

    if (bullets.length === 0) {
      bullets.push(`${actionVerbs[0]} key responsibilities as ${exp.job_title}`)
      bullets.push(`${actionVerbs[1]} solutions to improve team efficiency`)
      bullets.push(`${actionVerbs[2]} best practices for ${exp.job_title} role`)
    }

    return bullets
  }

  const updateExperienceBullets = async (expId, bullets) => {
    const { error } = await supabase
      .from('experiences')
      .update({ bullet_points: bullets })
      .eq('id', expId)

    if (!error) {
      setExperiences(experiences.map(exp =>
        exp.id === expId ? { ...exp, bullet_points: bullets } : exp
      ))
    }
  }

  const addSkill = async () => {
    if (!newSkill.trim()) return

    const { data, error } = await supabase
      .from('skills')
      .insert({
        profile_id: profile.id,
        name: newSkill.trim(),
        category: 'technical',
        proficiency: 'intermediate',
      })
      .select()
      .single()

    if (!error && data) {
      setSkills([...skills, data])
      setNewSkill('')
    }
  }

  const removeSkill = async (skillId) => {
    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', skillId)

    if (!error) {
      setSkills(skills.filter(s => s.id !== skillId))
    }
  }

  const exportToPDF = async () => {
    // Dynamic import of html2pdf
    const html2pdf = (await import('html2pdf.js')).default

    const element = document.getElementById('resume-preview')
    if (!element) return

    const opt = {
      margin: 0.5,
      filename: `${resume.name.replace(/\s+/g, '_')}.pdf`,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Editor Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resume Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Input
                label="Resume Name"
                value={resume.name}
                onChange={(e) => setResume({ ...resume, name: e.target.value })}
                placeholder="e.g., Software Developer Resume"
              />

              <Input
                label="Headline"
                value={resume.headline}
                onChange={(e) => setResume({ ...resume, headline: e.target.value })}
                placeholder="e.g., Customer-Focused Sales Professional"
              />

              <Textarea
                label="Summary"
                value={resume.summary}
                onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                placeholder="A brief summary of your professional background..."
                rows={4}
              />

              <div className="flex gap-2">
                <Button onClick={handleSave} loading={saving} className="flex-1">
                  Save Resume
                </Button>
                <Button onClick={exportToPDF} variant="secondary">
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Experience Section */}
          <Card>
            <CardHeader>
              <CardTitle>Work Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {experiences.length === 0 ? (
                <p className="text-sm text-slate-500">No experience added yet.</p>
              ) : (
                experiences.map((exp) => (
                  <div key={exp.id} className="bg-slate-50 rounded-xl p-4">
                    <h4 className="font-medium text-slate-900">{exp.job_title}</h4>
                    <p className="text-sm text-slate-600">{exp.company_name}</p>
                    <p className="text-xs text-slate-500 mb-3">
                      {new Date(exp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      {' - '}
                      {exp.is_current
                        ? 'Present'
                        : exp.end_date
                        ? new Date(exp.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </p>

                    {exp.bullet_points && exp.bullet_points.length > 0 ? (
                      <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                        {exp.bullet_points.map((bullet, i) => (
                          <li key={i}>{bullet}</li>
                        ))}
                      </ul>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const bullets = generateBulletPoints(exp)
                          updateExperienceBullets(exp.id, bullets)
                        }}
                      >
                        Suggest Bullet Points
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Skills Section */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Add a skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button onClick={addSkill} variant="secondary">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Chip key={skill.id} onRemove={() => removeSkill(skill.id)}>
                    {skill.name}
                  </Chip>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Education Section */}
          <Card>
            <CardHeader>
              <CardTitle>Education</CardTitle>
            </CardHeader>
            <CardContent>
              {education.length === 0 ? (
                <p className="text-sm text-slate-500">No education added yet.</p>
              ) : (
                education.map((edu) => (
                  <div key={edu.id} className="bg-slate-50 rounded-xl p-4">
                    <h4 className="font-medium text-slate-900">{edu.degree}</h4>
                    <p className="text-sm text-slate-600">{edu.school_name}</p>
                    {edu.field_of_study && (
                      <p className="text-xs text-slate-500">{edu.field_of_study}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                id="resume-preview"
                className="bg-white border border-slate-200 rounded-lg p-8 text-sm"
                style={{ minHeight: '600px' }}
              >
                {/* Header */}
                <div className="text-center mb-6 pb-4 border-b border-slate-200">
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    {profile?.full_name || 'Your Name'}
                  </h1>
                  {resume.headline && (
                    <p className="text-slate-600 font-medium mb-2">{resume.headline}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {[profile?.city, profile?.state].filter(Boolean).join(', ')}
                    {profile?.zip_code && ` ${profile.zip_code}`}
                  </p>
                </div>

                {/* Summary */}
                {resume.summary && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                      Summary
                    </h2>
                    <p className="text-slate-700">{resume.summary}</p>
                  </div>
                )}

                {/* Experience */}
                {experiences.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">
                      Experience
                    </h2>
                    {experiences.map((exp) => (
                      <div key={exp.id} className="mb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-slate-900">{exp.job_title}</h3>
                            <p className="text-slate-600">{exp.company_name}</p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {new Date(exp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
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
                            {exp.bullet_points.map((bullet, i) => (
                              <li key={i}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                      Skills
                    </h2>
                    <p className="text-slate-700">
                      {skills.map(s => s.name).join(' • ')}
                    </p>
                  </div>
                )}

                {/* Education */}
                {education.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">
                      Education
                    </h2>
                    {education.map((edu) => (
                      <div key={edu.id} className="mb-2">
                        <h3 className="font-semibold text-slate-900">{edu.degree}</h3>
                        <p className="text-slate-600">{edu.school_name}</p>
                        {edu.field_of_study && (
                          <p className="text-xs text-slate-500">{edu.field_of_study}</p>
                        )}
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
