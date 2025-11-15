import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'

export function AddJob() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    salary_min: '',
    salary_max: '',
    description: '',
    source_url: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.title || !formData.company || !formData.description) {
      setError('Please fill in job title, company, and description')
      return
    }

    setLoading(true)

    try {
      // Create job post
      const { data: jobPost, error: jobError } = await supabase
        .from('job_posts')
        .insert({
          user_id: user.id,
          title: formData.title,
          company: formData.company,
          location: formData.location,
          salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
          salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
          description: formData.description,
          source_url: formData.source_url,
        })
        .select()
        .single()

      if (jobError) throw jobError

      // Calculate match score
      await calculateMatchScore(jobPost.id)

      navigate(`/jobs/${jobPost.id}`)
    } catch (err) {
      console.error('Error adding job:', err)
      setError(err.message || 'Failed to add job posting')
    } finally {
      setLoading(false)
    }
  }

  const calculateMatchScore = async (jobPostId) => {
    try {
      // Get user's skills
      const { data: userSkills } = await supabase
        .from('skills')
        .select('name')
        .eq('profile_id', profile.id)

      // Get default resume
      const { data: defaultResume } = await supabase
        .from('resume_profiles')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('is_default', true)
        .single()

      if (!defaultResume) return

      // Extract keywords from job description
      const jobKeywords = extractKeywords(formData.description)
      const userSkillNames = userSkills?.map(s => s.name.toLowerCase()) || []

      // Calculate matches
      const matched = []
      const missing = []

      jobKeywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase()
        if (userSkillNames.some(skill =>
          skill.includes(keywordLower) || keywordLower.includes(skill)
        )) {
          matched.push(keyword)
        } else {
          missing.push(keyword)
        }
      })

      // Calculate score (simple percentage)
      const score = jobKeywords.length > 0
        ? Math.round((matched.length / jobKeywords.length) * 100)
        : 50

      // Create match record
      await supabase.from('job_matches').insert({
        job_post_id: jobPostId,
        resume_profile_id: defaultResume.id,
        match_score: score,
        matched_keywords: matched,
        missing_keywords: missing.slice(0, 10), // Top 10 missing
        analysis_summary: `You match ${matched.length} out of ${jobKeywords.length} key skills.`,
      })
    } catch (err) {
      console.error('Error calculating match:', err)
    }
  }

  const extractKeywords = (text) => {
    // Common skills and keywords to look for
    const commonSkills = [
      'communication', 'leadership', 'teamwork', 'problem solving',
      'time management', 'customer service', 'sales', 'marketing',
      'project management', 'data analysis', 'microsoft office', 'excel',
      'python', 'javascript', 'react', 'node.js', 'sql', 'aws',
      'agile', 'scrum', 'git', 'html', 'css', 'java', 'c++',
      'machine learning', 'ai', 'cloud', 'devops', 'ci/cd',
      'attention to detail', 'organizational', 'multitasking',
      'presentation', 'negotiation', 'analytical', 'creative',
    ]

    const textLower = text.toLowerCase()
    const found = []

    commonSkills.forEach(skill => {
      if (textLower.includes(skill)) {
        found.push(skill)
      }
    })

    // Extract years of experience mentions
    const expMatch = textLower.match(/(\d+)\+?\s*years?\s*(of)?\s*experience/g)
    if (expMatch) {
      found.push(...expMatch)
    }

    return [...new Set(found)]
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Add Job Posting</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Paste job details to see how well you match
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <Input
              label="Job Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Software Engineer"
              required
            />

            <Input
              label="Company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="e.g., Google"
              required
            />

            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., San Francisco, CA or Remote"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Min Salary (optional)"
                type="number"
                value={formData.salary_min}
                onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                placeholder="60000"
              />
              <Input
                label="Max Salary (optional)"
                type="number"
                value={formData.salary_max}
                onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                placeholder="90000"
              />
            </div>

            <Textarea
              label="Job Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Paste the full job description here..."
              rows={10}
              required
            />

            <Input
              label="Job URL (optional)"
              type="url"
              value={formData.source_url}
              onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
              placeholder="https://..."
            />

            <div className="flex gap-3">
              <Button type="submit" loading={loading} className="flex-1">
                Add & Analyze
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
