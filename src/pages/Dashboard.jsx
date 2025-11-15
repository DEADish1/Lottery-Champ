import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Loader } from '../components/ui/Loader'

export function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    resumeProfiles: [],
    jobPosts: [],
    applications: [],
  })

  useEffect(() => {
    if (!profile?.full_name) {
      navigate('/onboarding')
      return
    }
    fetchDashboardData()
  }, [profile, navigate])

  const fetchDashboardData = async () => {
    try {
      const profileId = profile?.id

      // Fetch resume profiles
      const { data: resumes } = await supabase
        .from('resume_profiles')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })

      // Fetch job posts with match scores
      const { data: jobs } = await supabase
        .from('job_posts')
        .select(`
          *,
          job_matches (match_score)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch applications
      const { data: apps } = await supabase
        .from('applications')
        .select(`
          *,
          job_posts (title, company)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setStats({
        resumeProfiles: resumes || [],
        jobPosts: jobs || [],
        applications: apps || [],
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const getStatusCounts = () => {
    const counts = {
      Applied: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
      Ghosted: 0,
    }
    stats.applications.forEach(app => {
      if (counts[app.status] !== undefined) {
        counts[app.status]++
      }
    })
    return counts
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  const statusCounts = getStatusCounts()
  const defaultResume = stats.resumeProfiles.find(r => r.is_default) || stats.resumeProfiles[0]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm">
          {defaultResume && (
            <span className="text-green-600 font-medium">
              Resume ready
            </span>
          )}
          <span className="text-slate-600">
            {stats.applications.length} total applications
          </span>
          {statusCounts.Interview > 0 && (
            <span className="text-primary-600 font-medium">
              {statusCounts.Interview} interview{statusCounts.Interview !== 1 ? 's' : ''} scheduled
            </span>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Resume Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Your Resume</CardTitle>
          </CardHeader>
          <CardContent>
            {defaultResume ? (
              <div>
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <h4 className="font-medium text-slate-900 mb-1">
                    {defaultResume.name}
                  </h4>
                  <p className="text-sm text-slate-600 mb-2">
                    {defaultResume.headline || 'No headline set'}
                  </p>
                  {defaultResume.is_default && (
                    <Badge variant="success">Default</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Link to={`/resume/${defaultResume.id}`}>
                    <Button className="w-full" variant="secondary">
                      View & Edit Resume
                    </Button>
                  </Link>
                  <Link to="/resume/new">
                    <Button className="w-full" variant="ghost">
                      Create New Version
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No resume yet"
                description="Create your first resume to get started"
                action={
                  <Link to="/resume/new">
                    <Button>Create Resume</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Job Posts Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Job Posts</CardTitle>
              <Link to="/jobs/new">
                <Button size="sm">Add Job</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.jobPosts.length > 0 ? (
              <div className="space-y-3">
                {stats.jobPosts.slice(0, 3).map(job => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="block bg-slate-50 rounded-xl p-3 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-slate-900 text-sm">
                          {job.title}
                        </h4>
                        <p className="text-xs text-slate-600">{job.company}</p>
                      </div>
                      {job.job_matches?.[0] && (
                        <Badge
                          variant={
                            job.job_matches[0].match_score >= 70
                              ? 'success'
                              : job.job_matches[0].match_score >= 50
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {job.job_matches[0].match_score}%
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
                {stats.jobPosts.length > 3 && (
                  <Link
                    to="/jobs"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View all {stats.jobPosts.length} jobs →
                  </Link>
                )}
              </div>
            ) : (
              <EmptyState
                title="No jobs saved"
                description="Add job postings to see match scores"
                action={
                  <Link to="/jobs/new">
                    <Button size="sm">Add Job Posting</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Applications Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Applications</CardTitle>
              <Link to="/applications">
                <Button size="sm" variant="secondary">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.applications.length > 0 ? (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {statusCounts.Applied}
                    </p>
                    <p className="text-xs text-blue-700">Applied</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {statusCounts.Interview}
                    </p>
                    <p className="text-xs text-green-700">Interviews</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {statusCounts.Offer}
                    </p>
                    <p className="text-xs text-purple-700">Offers</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-slate-600">
                      {statusCounts.Rejected + statusCounts.Ghosted}
                    </p>
                    <p className="text-xs text-slate-700">Closed</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {stats.applications.slice(0, 3).map(app => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-700 truncate">
                        {app.job_posts?.title}
                      </span>
                      <Badge
                        variant={
                          app.status === 'Interview'
                            ? 'success'
                            : app.status === 'Offer'
                            ? 'primary'
                            : app.status === 'Rejected'
                            ? 'danger'
                            : 'default'
                        }
                      >
                        {app.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                title="No applications yet"
                description="Track your job applications here"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
