-- Create dice_rolls table
CREATE TABLE public.dice_rolls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reward_code TEXT NOT NULL UNIQUE,
  dice_value INTEGER NOT NULL,
  reward_won TEXT NOT NULL,
  bill_amount NUMERIC NOT NULL,
  device_id TEXT NOT NULL,
  redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dice_rolls ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Allow public insert" ON public.dice_rolls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON public.dice_rolls FOR SELECT USING (true);
CREATE POLICY "Allow public update" ON public.dice_rolls FOR UPDATE USING (true);
