-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_plan_name TEXT,
    subscription_status TEXT DEFAULT 'trialing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_cust ON public.organizations(stripe_customer_id);

-- 2. PROFILES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    role TEXT CHECK (role IN ('owner', 'admin', 'editor', 'viewer')) DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);

-- 3. SKILLS
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger TEXT,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    active_version_id UUID, -- Updated dynamically
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skills_org ON public.skills(organization_id);

-- 4. SKILL VERSIONS
CREATE TABLE public.skill_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    version_number TEXT NOT NULL, -- e.g., '1.0.0'
    content JSONB NOT NULL, -- Contains: instructions, templates, constraints, checklists, examples
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changelog TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON public.skill_versions(skill_id);

-- Now we can add the foreign key constraint on skills back to active_version_id
ALTER TABLE public.skills ADD CONSTRAINT fk_skills_active_version FOREIGN KEY (active_version_id) REFERENCES public.skill_versions(id) ON DELETE SET NULL;

-- 5. EXECUTION LOGS
CREATE TABLE public.execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    skill_version_id UUID REFERENCES public.skill_versions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    input_data JSONB,
    output_data JSONB,
    latency_ms INTEGER,
    token_count INTEGER,
    cost_usd NUMERIC(10, 6),
    rating INTEGER CHECK (rating IN (1, -1)), -- 1 for upvote, -1 for downvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_skill ON public.execution_logs(skill_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_rating ON public.execution_logs(rating) WHERE rating = -1;

-- 6. HUMAN FEEDBACK
CREATE TABLE public.human_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES public.execution_logs(id) ON DELETE CASCADE,
    corrected_output TEXT NOT NULL,
    notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_human_feedback_log ON public.human_feedback(log_id);

-- 7. NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('alert', 'weekly_digest', 'system')) DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helpers for RLS policies
-- Get user organization ID helper
CREATE OR REPLACE FUNCTION public.get_user_org() 
RETURNS UUID AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Organizations Policies
CREATE POLICY "Users can view their own organization" 
    ON public.organizations FOR SELECT 
    USING (id = public.get_user_org());

CREATE POLICY "Owners/Admins can update organization" 
    ON public.organizations FOR UPDATE 
    USING (id = public.get_user_org() AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin')
    ));

-- 2. Profiles Policies
CREATE POLICY "Users can view profiles in the same organization" 
    ON public.profiles FOR SELECT 
    USING (organization_id = public.get_user_org());

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (id = auth.uid());

-- 3. Skills Policies
CREATE POLICY "Users can view skills in their organization" 
    ON public.skills FOR SELECT 
    USING (organization_id = public.get_user_org());

CREATE POLICY "Admins/Owners/Editors can insert skills" 
    ON public.skills FOR INSERT 
    WITH CHECK (organization_id = public.get_user_org() AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin', 'editor')
    ));

CREATE POLICY "Admins/Owners/Editors can update skills" 
    ON public.skills FOR UPDATE 
    USING (organization_id = public.get_user_org() AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin', 'editor')
    ));

CREATE POLICY "Admins/Owners/Editors can delete skills" 
    ON public.skills FOR DELETE 
    USING (organization_id = public.get_user_org() AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin')
    ));

-- 4. Skill Versions Policies
CREATE POLICY "Users can view skill versions" 
    ON public.skill_versions FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.skills 
        WHERE skills.id = skill_versions.skill_id AND skills.organization_id = public.get_user_org()
    ));

CREATE POLICY "Admins/Owners/Editors can insert skill versions" 
    ON public.skill_versions FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.skills 
        WHERE skills.id = skill_versions.skill_id AND skills.organization_id = public.get_user_org()
    ) AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin', 'editor')
    ));

-- 5. Execution Logs Policies
CREATE POLICY "Users can view execution logs" 
    ON public.execution_logs FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.skills 
        WHERE skills.id = execution_logs.skill_id AND skills.organization_id = public.get_user_org()
    ));

CREATE POLICY "Service or User can insert logs" 
    ON public.execution_logs FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.skills 
        WHERE skills.id = execution_logs.skill_id AND skills.organization_id = public.get_user_org()
    ));

-- 6. Human Feedback Policies
CREATE POLICY "Users can view human feedback" 
    ON public.human_feedback FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.execution_logs 
        JOIN public.skills ON skills.id = execution_logs.skill_id
        WHERE execution_logs.id = human_feedback.log_id AND skills.organization_id = public.get_user_org()
    ));

CREATE POLICY "Users can insert human feedback" 
    ON public.human_feedback FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.execution_logs 
        JOIN public.skills ON skills.id = execution_logs.skill_id
        WHERE execution_logs.id = human_feedback.log_id AND skills.organization_id = public.get_user_org()
    ));

-- 7. Notifications Policies
CREATE POLICY "Users can view their own notifications" 
    ON public.notifications FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
    ON public.notifications FOR UPDATE 
    USING (user_id = auth.uid());

-- AUTH TRIGGER TRIGGER TO AUTO-CREATE ORG & PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    org_name TEXT;
BEGIN
    org_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Org';
    
    -- Insert new organization
    INSERT INTO public.organizations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;
    
    -- Insert profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url, organization_id, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
        new_org_id,
        'owner'
    );
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute function on new signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
