# Competitor Stack

A powerful AI-powered competitor analysis tool that helps you discover and analyze your top 3 competitors for any given company domain.

## Features

- 🔍 **Instant Competitor Discovery**: Get your top 3 competitors identified through advanced AI analysis
- 📊 **Detailed Analysis**: Comprehensive insights into each competitor's strengths, weaknesses, and market positioning
- 🎨 **Beautiful JSON Viewer**: View results in a beautiful, collapsible JSON format with syntax highlighting
- 💾 **Data Persistence**: All analysis results are automatically saved to Supabase for future reference
- 🌍 **Multi-language Support**: Detects user language and stores it with analysis results

## How it works

1. Enter a company domain (e.g., netflix.com, spotify.com)
2. Our AI analyzes the company and identifies the top 3 competitors
3. View detailed competitor analysis in a beautiful JSON format
4. Results are automatically saved to the database for future reference

## Technologies Used

- **Frontend**: React, TypeScript, Vite
- **UI**: shadcn-ui, Tailwind CSS
- **AI**: Dust AI (Agent ID: ie0BWeH59h)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS

## Setup

### Prerequisites

- Node.js & npm installed
- Supabase project with the required table

### Installation

1. Clone the repository:

```bash
git clone <YOUR_GIT_URL>
cd competitor-stack-test
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```
VITE_SUPABASE_URL=https://yqmuzemeyndcpovfbjqu.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. Set up the database:

   - Run the SQL migration in your Supabase project:

   ```sql
   -- Create competitor_stack table
   CREATE TABLE IF NOT EXISTS competitor_stack (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       company_domain TEXT NOT NULL,
       competitors_data JSONB NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       user_language TEXT
   );
   ```

5. Start the development server:

```bash
npm run dev
```

## Database Schema

The `competitor_stack` table stores all competitor analysis results:

- `id`: UUID (Primary Key)
- `company_domain`: Text (The analyzed company domain)
- `competitors_data`: JSONB (The complete analysis results)
- `created_at`: Timestamp (When the analysis was performed)
- `user_language`: Text (Optional - detected user language)

## API Integration

The application uses Dust AI with agent ID `ie0BWeH59h` to perform competitor analysis. The agent returns detailed competitor information in JSON format.

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── JsonViewer.tsx   # Beautiful JSON display component
│   └── InputForm.tsx    # Domain input form
├── pages/               # Page components
│   ├── Index.tsx        # Landing page
│   └── CompetitorStackPage.tsx # Results page
├── services/            # API and database services
│   ├── api.ts           # Dust AI integration
│   ├── competitorStackService.ts # Competitor stack utilities
│   └── supabaseService.ts # Supabase operations
├── hooks/               # Custom React hooks
│   └── useCompetitorStackData.tsx # Data fetching hook
└── lib/                 # Utility libraries
    └── supabase.ts      # Supabase client configuration
```

### Key Components

- **JsonViewer**: Displays JSON data in a beautiful, collapsible format with syntax highlighting
- **InputForm**: Form for company domain and email input
- **CompetitorStackPage**: Results page showing competitor analysis in JSON format
- **useCompetitorStackData**: Hook for managing competitor analysis data and polling

## Deployment

The application can be deployed to any static hosting service:

- **Netlify**: Connect your GitHub repository
- **Vercel**: Import your GitHub repository
- **GitHub Pages**: Use GitHub Actions for deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
