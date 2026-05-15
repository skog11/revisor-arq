-- Create rate_limits table for persistent rate limiting across serverless instances
CREATE TABLE IF NOT EXISTS public.rate_limits (
    ip TEXT PRIMARY KEY,
    timestamps BIGINT[] DEFAULT '{}'::BIGINT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- NOTE: Since we use the service role client in the backend, 
-- it bypasses RLS by default. But we enable it for safety.
