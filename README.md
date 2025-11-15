# Swift Apply - Smart Resume Builder & Job Application Tracker

A modern web application that helps job seekers build ATS-friendly resumes, match their skills to job postings, and track their application pipeline.

## Features

- **Guided Onboarding**: Answer simple questions to build your professional profile
- **Smart Resume Builder**: Generate powerful bullet points and multiple resume versions
- **Job Matching**: See how well you match each job posting with skills analysis
- **Tailored Resumes**: Auto-generate customized resumes for specific job postings
- **Application Tracker**: Track your job applications with a Kanban-style pipeline view
- **PDF Export**: Export your resumes as professional PDFs

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth + PostgreSQL)
- **PDF Export**: html2pdf.js
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd swift-apply
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the schema from `supabase/schema.sql`
   - Copy your project URL and anon key from Settings > API

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── supabase/
│   └── schema.sql          # Database schema and RLS policies
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Main app with routing
    ├── index.css           # Global styles
    ├── components/
    │   ├── ui/             # Reusable UI components
    │   ├── layout/         # Layout components (Header, Footer)
    │   └── ProtectedRoute.jsx
    ├── contexts/
    │   └── AuthContext.jsx # Authentication state management
    ├── lib/
    │   └── supabase.js     # Supabase client
    └── pages/
        ├── Landing.jsx     # Homepage
        ├── Auth.jsx        # Login/Signup
        ├── Onboarding.jsx  # Profile setup wizard
        ├── Dashboard.jsx   # Main dashboard
        ├── ResumeBuilder.jsx
        ├── AddJob.jsx      # Add job posting
        ├── JobDetail.jsx   # Job match analysis
        ├── Applications.jsx # Application tracker
        └── TailoredResume.jsx
```

## Key Features Explained

### Resume Builder
- Two-column layout with live preview
- Auto-generate bullet points for work experience
- Manage skills with easy add/remove
- Export to PDF with one click

### Job Matching
- Paste job descriptions to analyze
- Automatic keyword extraction
- Match score (0-100) with breakdown
- See matched skills and what you're missing

### Tailored Resumes
- Generate job-specific resume versions
- Skills reordered by relevance
- Customized headline and summary
- Edit and export tailored versions

### Application Tracker
- Kanban-style pipeline view
- Track status: Applied, Interview, Offer, Rejected, Ghosted
- Add notes to each application
- Quick status updates

## Database Schema

The app uses Supabase (PostgreSQL) with the following main tables:
- `profiles` - User profile information
- `experiences` - Work history
- `education` - Educational background
- `skills` - User skills
- `resume_profiles` - Resume versions
- `job_posts` - Saved job postings
- `job_matches` - Match scores and analysis
- `tailored_resumes` - Job-specific resume versions
- `applications` - Application tracking

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
