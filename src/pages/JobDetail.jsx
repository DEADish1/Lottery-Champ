import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { Loader } from '../components/ui/Loader'

export function JobDetail() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tailoring, setTailoring] = useState(false)
  const [job, setJob] = useState(null)
  const [match, setMatch] = useState(null)
  const [tailoredResume, setTailoredResume] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJobData()
  }, [id])

  const fetchJobData = async () => {
    try {
      // Fetch job post
      const { data: jobData, error: jobError } = await supabase
        .from('job_posts')
        .select('*')
        .eq('id', id)
        .single()

      if (jobError) throw jobError
      setJob(jobData)

      // Fetch match score
      const { data: matchData } = await supabase
        .from('job_matches')
        .select('*')
        .eq('job_post_id', id)
        .single()

      setMatch(matchData)

      // Check for existing tailored resume
      const { data: tailored } = await supabase
        .from('tailored_resumes')
        .select('*')
        .eq('job_post_id', id)
        .single()

      setTailoredResume(tailored)
    } catch (err) {
      console.error('Error fetching job:', err)
      setError('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const tailorResume = async () => {
    setTailoring(true)
    setError('')

    try {
      // Get user's resume data
      const { data: experiences } = await supabase
        .from('experiences')
        .select('*')
        .eq('profile_id', profile.id)
        .order('start_date', { ascending: false })

      const { data: skills } = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', profile.id)

      const { data: education } = await supabase
        .from('education')
        .select('*')
        .eq('profile_id', profile.id)

      const { data: defaultResume } = await supabase
        .from('resume_profiles')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('is_default', true)
        .single()

      // Create tailored content
      // Reorder skills: matched ones first
      const matchedKeywords = match?.matched_keywords || []
      const sortedSkills = [...(skills || [])].sort((a, b) => {
        const aMatched = matchedKeywords.some(k =>
          a.name.toLowerCase().includes(k.toLowerCase())
        )
        const bMatched = matchedKeywords.some(k =>
          b.name.toLowerCase().includes(k.toLowerCase())
        )
        return bMatched - aMatched
      })

      // Generate tailored headline
      const tailoredHeadline = job.title.includes(defaultResume?.headline || '')
        ? defaultResume?.headline
        : `${job.title} | ${defaultResume?.headline || 'Professional'}`

      // Generate tailored summary
      const tailoredSummary = `Experienced professional seeking ${job.title} position at ${job.company}. ${defaultResume?.summary || ''}`

      const content = {
        headline: tailoredHeadline,
        summary: tailoredSummary,
        experience: experiences || [],
        skills: sortedSkills,
        education: education || [],
      }

      // Save tailored resume
      const { data: newTailored, error: tailorError } = await supabase
        .from('tailored_resumes')
        .insert({
          job_post_id: id,
          resume_profile_id: defaultResume.id,
          title: `Resume for ${job.title} at ${job.company}`,
          content,
        })
        .select()
        .single()

      if (tailorError) throw tailorError

      setTailoredResume(newTailored)
    } catch (err) {
      console.error('Error tailoring resume:', err)
      setError('Failed to tailor resume')
    } finally {
      setTailoring(false)
    }
  }

  const getScoreLabel = (score) => {
    if (score >= 70) return { text: 'Strong Match', variant: 'success' }
    if (score >= 50) return { text: 'Decent Match', variant: 'warning' }
    return { text: 'Stretch', variant: 'default' }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="error">Job not found</Alert>
      </div>
    )
  }

  const scoreLabel = match ? getScoreLabel(match.match_score) : null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Job Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                {job.title}
              </h1>
              <p className="text-lg text-slate-600">{job.company}</p>
              {job.location && (
                <p className="text-sm text-slate-500 mt-1">{job.location}</p>
              )}
              {(job.salary_min || job.salary_max) && (
                <p className="text-sm text-slate-500">
                  Salary: ${job.salary_min?.toLocaleString() || '?'} - ${job.salary_max?.toLocaleString() || '?'}
                </p>
              )}
            </div>
            {job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View Original →
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Match Score */}
        <div className="lg:col-span-1 space-y-6">
          {match && (
            <Card>
              <CardHeader>
                <CardTitle>Match Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-100 mb-3">
                    <span className="text-3xl font-bold text-slate-900">
                      {match.match_score}
                    </span>
                  </div>
                  <Badge variant={scoreLabel?.variant} className="text-sm">
                    {scoreLabel?.text}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2">
                      You Have ({match.matched_keywords?.length || 0})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {match.matched_keywords?.map((keyword, i) => (
                        <span
                          key={i}
                          className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                      {(!match.matched_keywords || match.matched_keywords.length === 0) && (
                        <span className="text-xs text-slate-500">None identified</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2">
                      Missing ({match.missing_keywords?.length || 0})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {match.missing_keywords?.map((keyword, i) => (
                        <span
                          key={i}
                          className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                      {(!match.missing_keywords || match.missing_keywords.length === 0) && (
                        <span className="text-xs text-slate-500">None identified</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tailor Resume */}
          <Card>
            <CardHeader>
              <CardTitle>Tailor Resume</CardTitle>
            </CardHeader>
            <CardContent>
              {error && <Alert variant="error" className="mb-3">{error}</Alert>}

              {tailoredResume ? (
                <div>
                  <p className="text-sm text-green-600 mb-3">
                    Resume tailored for this job
                  </p>
                  <Link to={`/tailored-resume/${tailoredResume.id}`}>
                    <Button className="w-full">
                      View Tailored Resume
                    </Button>
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-600 mb-3">
                    Generate a resume version optimized for this job posting
                  </p>
                  <Button
                    onClick={tailorResume}
                    loading={tailoring}
                    className="w-full"
                  >
                    Tailor Resume to This Job
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Job Description */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 bg-slate-50 p-4 rounded-xl">
                {job.description}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
