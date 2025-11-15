import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Alert } from '../components/ui/Alert'

const STEPS = [
  { id: 'basic', title: 'Basic Info', description: 'Tell us about yourself' },
  { id: 'interests', title: 'Job Interests', description: 'What are you looking for?' },
  { id: 'experience', title: 'Experience', description: 'Your work history' },
  { id: 'skills', title: 'Skills', description: 'What can you do?' },
  { id: 'review', title: 'Review', description: 'Confirm your info' },
]

const SUGGESTED_SKILLS = [
  'Customer Service',
  'Communication',
  'Time Management',
  'Microsoft Office',
  'Problem Solving',
  'Teamwork',
  'Leadership',
  'Data Entry',
  'Cash Handling',
  'Sales',
]

export function Onboarding() {
  const { user, updateProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    city: '',
    state: '',
    zip_code: '',
    remote_ok: false,
    target_titles: [],
    salary_min: '',
    salary_max: '',
    employment_types: [],
    schedule_preferences: [],
  })

  const [newTitle, setNewTitle] = useState('')
  const [experience, setExperience] = useState({
    company_name: '',
    job_title: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description_raw: '',
  })

  const [skills, setSkills] = useState([])
  const [newSkill, setNewSkill] = useState('')

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTitle = () => {
    if (newTitle.trim() && !formData.target_titles.includes(newTitle.trim())) {
      updateFormData('target_titles', [...formData.target_titles, newTitle.trim()])
      setNewTitle('')
    }
  }

  const removeTitle = (title) => {
    updateFormData('target_titles', formData.target_titles.filter(t => t !== title))
  }

  const toggleEmploymentType = (type) => {
    if (formData.employment_types.includes(type)) {
      updateFormData('employment_types', formData.employment_types.filter(t => t !== type))
    } else {
      updateFormData('employment_types', [...formData.employment_types, type])
    }
  }

  const addSkill = (skillName) => {
    const name = skillName || newSkill.trim()
    if (name && !skills.includes(name)) {
      setSkills([...skills, name])
      setNewSkill('')
    }
  }

  const removeSkill = (skill) => {
    setSkills(skills.filter(s => s !== skill))
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')

    try {
      // Update profile
      const { error: profileError } = await updateProfile({
        full_name: formData.full_name,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        remote_ok: formData.remote_ok,
        target_titles: formData.target_titles,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
        employment_types: formData.employment_types,
        schedule_preferences: formData.schedule_preferences,
      })

      if (profileError) throw profileError

      // Get profile ID
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!profileData) throw new Error('Profile not found')

      // Add experience if provided
      if (experience.company_name && experience.job_title) {
        const { error: expError } = await supabase.from('experiences').insert({
          profile_id: profileData.id,
          ...experience,
        })
        if (expError) throw expError
      }

      // Add skills
      if (skills.length > 0) {
        const skillInserts = skills.map(skill => ({
          profile_id: profileData.id,
          name: skill,
          category: 'technical',
          proficiency: 'intermediate',
        }))
        const { error: skillsError } = await supabase.from('skills').insert(skillInserts)
        if (skillsError) throw skillsError
      }

      // Create default resume profile
      const { error: resumeError } = await supabase.from('resume_profiles').insert({
        profile_id: profileData.id,
        name: 'My Resume',
        headline: formData.target_titles[0] || 'Professional',
        summary: '',
        is_default: true,
      })
      if (resumeError) throw resumeError

      await refreshProfile()
      navigate('/dashboard')
    } catch (err) {
      console.error('Onboarding error:', err)
      setError(err.message || 'Failed to save your information')
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'basic':
        return (
          <div className="space-y-4">
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => updateFormData('full_name', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                placeholder="San Francisco"
                value={formData.city}
                onChange={(e) => updateFormData('city', e.target.value)}
              />
              <Input
                label="State"
                placeholder="CA"
                value={formData.state}
                onChange={(e) => updateFormData('state', e.target.value)}
              />
            </div>
            <Input
              label="ZIP Code"
              placeholder="94105"
              value={formData.zip_code}
              onChange={(e) => updateFormData('zip_code', e.target.value)}
            />
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.remote_ok}
                onChange={(e) => updateFormData('remote_ok', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-slate-700">
                I'm open to remote roles
              </span>
            </label>
          </div>
        )

      case 'interests':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Desired Job Titles
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="e.g., Software Engineer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTitle())}
                />
                <Button onClick={addTitle} variant="secondary">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.target_titles.map(title => (
                  <Chip key={title} onRemove={() => removeTitle(title)}>
                    {title}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Minimum Salary"
                type="number"
                placeholder="40000"
                value={formData.salary_min}
                onChange={(e) => updateFormData('salary_min', e.target.value)}
              />
              <Input
                label="Maximum Salary"
                type="number"
                placeholder="80000"
                value={formData.salary_max}
                onChange={(e) => updateFormData('salary_max', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Employment Type
              </label>
              <div className="flex flex-wrap gap-2">
                {['Full-time', 'Part-time', 'Contract', 'Internship'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleEmploymentType(type)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      formData.employment_types.includes(type)
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'experience':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">
              Add your most recent job. You can add more later.
            </p>
            <Input
              label="Company Name"
              placeholder="Acme Corp"
              value={experience.company_name}
              onChange={(e) => setExperience({ ...experience, company_name: e.target.value })}
            />
            <Input
              label="Job Title"
              placeholder="Sales Associate"
              value={experience.job_title}
              onChange={(e) => setExperience({ ...experience, job_title: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={experience.start_date}
                onChange={(e) => setExperience({ ...experience, start_date: e.target.value })}
              />
              <Input
                label="End Date"
                type="date"
                value={experience.end_date}
                onChange={(e) => setExperience({ ...experience, end_date: e.target.value })}
                disabled={experience.is_current}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={experience.is_current}
                onChange={(e) => setExperience({ ...experience, is_current: e.target.checked, end_date: '' })}
                className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-slate-700">
                I currently work here
              </span>
            </label>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Brief Description
              </label>
              <textarea
                rows={3}
                placeholder="What did you do in this role?"
                value={experience.description_raw}
                onChange={(e) => setExperience({ ...experience, description_raw: e.target.value })}
                className="input-field resize-none"
              />
            </div>
          </div>
        )

      case 'skills':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your Skills
              </label>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="e.g., Project Management"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button onClick={() => addSkill()} variant="secondary">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.map(skill => (
                  <Chip key={skill} onRemove={() => removeSkill(skill)}>
                    {skill}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SKILLS.filter(s => !skills.includes(s)).map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => addSkill(skill)}
                    className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 transition-colors"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="font-medium text-slate-900 mb-2">Basic Info</h4>
              <p className="text-sm text-slate-600">{formData.full_name || 'Not provided'}</p>
              <p className="text-sm text-slate-600">
                {[formData.city, formData.state, formData.zip_code].filter(Boolean).join(', ') || 'Location not provided'}
              </p>
              <p className="text-sm text-slate-600">
                Remote: {formData.remote_ok ? 'Yes' : 'No'}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="font-medium text-slate-900 mb-2">Job Interests</h4>
              <p className="text-sm text-slate-600">
                Titles: {formData.target_titles.join(', ') || 'Not specified'}
              </p>
              <p className="text-sm text-slate-600">
                Salary: {formData.salary_min || '?'} - {formData.salary_max || '?'}
              </p>
              <p className="text-sm text-slate-600">
                Types: {formData.employment_types.join(', ') || 'Not specified'}
              </p>
            </div>

            {experience.company_name && (
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-medium text-slate-900 mb-2">Experience</h4>
                <p className="text-sm text-slate-600">
                  {experience.job_title} at {experience.company_name}
                </p>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="font-medium text-slate-900 mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1">
                {skills.length > 0 ? (
                  skills.map(skill => (
                    <span key={skill} className="text-sm text-slate-600 bg-white px-2 py-0.5 rounded">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">No skills added</p>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent>
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex-1 text-center ${index < STEPS.length - 1 ? 'relative' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      index <= currentStep
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {index < currentStep ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-600 hidden sm:block">
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative">
              <div className="h-2 bg-slate-200 rounded-full">
                <div
                  className="h-2 bg-primary-600 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-1">
              {STEPS[currentStep].title}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {STEPS[currentStep].description}
            </p>

            {error && <Alert variant="error" className="mb-4">{error}</Alert>}

            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </Button>

            {currentStep === STEPS.length - 1 ? (
              <Button onClick={handleComplete} loading={loading}>
                Generate My Resume
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Continue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
