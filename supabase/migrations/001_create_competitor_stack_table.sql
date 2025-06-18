-- Create competitor_stack table
CREATE TABLE IF NOT EXISTS competitor_stack (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_domain TEXT NOT NULL,
    competitors_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_language TEXT
);

-- Create index on company_domain for faster lookups
CREATE INDEX IF NOT EXISTS idx_competitor_stack_company_domain ON competitor_stack(company_domain);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_competitor_stack_created_at ON competitor_stack(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE competitor_stack ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can modify this based on your security requirements)
CREATE POLICY "Allow all operations on competitor_stack" ON competitor_stack
    FOR ALL USING (true); 