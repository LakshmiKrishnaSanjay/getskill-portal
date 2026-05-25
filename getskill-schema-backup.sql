--
-- PostgreSQL database dump
--

\restrict PUfgwkjSBol5yywhVxRW6lF9bh2I3k6hAZ6hwstJ6H895sIiazzTg0vwvEHhodq

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: current_mentor_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_mentor_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select id
  from public.mentors
  where profile_id = auth.uid()
  limit 1
$$;


--
-- Name: current_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1
$$;


--
-- Name: generate_mentor_code(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_mentor_code(p_course_id uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
declare
  v_course_code text;
  v_next_number integer;
  v_mentor_code text;
begin
  select code
  into v_course_code
  from public.courses
  where id = p_course_id
  and is_active = true;

  if v_course_code is null then
    raise exception 'Active course not found';
  end if;

  select count(*) + 1
  into v_next_number
  from public.mentors
  where course_id = p_course_id;

  v_mentor_code :=
    'PPT-' || upper(v_course_code) || '-' || lpad(v_next_number::text, 3, '0');

  return v_mentor_code;
end;
$$;


--
-- Name: get_current_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1
$$;


--
-- Name: handle_new_user_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  meta_full_name text;
  meta_role text;
BEGIN
  meta_full_name := NEW.raw_user_meta_data ->> 'full_name';
  meta_role := NEW.raw_user_meta_data ->> 'role';

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(meta_full_name, ''), NEW.email),
    CASE
      WHEN meta_role IN ('student', 'mentor', 'admin') THEN meta_role
      ELSE 'student'
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    course_interest text NOT NULL,
    status text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admissions_status_check CHECK ((status = ANY (ARRAY['new'::text, 'reviewing'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    mentor_id uuid NOT NULL,
    cohort_id uuid NOT NULL,
    attendance_date date NOT NULL,
    status text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'late'::text, 'absent'::text])))
);


--
-- Name: cohort_mentors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cohort_mentors (
    cohort_id uuid NOT NULL,
    mentor_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cohorts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cohorts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    start_date date,
    end_date date,
    status text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cohort_code text,
    course_id uuid,
    mentor_id uuid,
    batch_mode text,
    batch_start_time time without time zone,
    max_seats integer DEFAULT 20 NOT NULL,
    batch_end_time time without time zone,
    CONSTRAINT cohorts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'completed'::text, 'archived'::text])))
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    duration_weeks integer,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    slug text,
    tagline text,
    work_packages_count integer DEFAULT 0 NOT NULL,
    portfolio_outputs_count integer DEFAULT 0 NOT NULL,
    pass_mark integer DEFAULT 70 NOT NULL,
    levels jsonb DEFAULT '[]'::jsonb NOT NULL,
    tools jsonb DEFAULT '[]'::jsonb NOT NULL,
    portfolio_outputs jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: mentors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    specialization text,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    profile_picture_url text,
    course_id uuid,
    mentor_code text,
    manual_mentor_code text,
    date_of_joining date,
    CONSTRAINT mentors_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['student'::text, 'mentor'::text, 'admin'::text, 'superadmin'::text, 'placement'::text])))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    score integer,
    feedback text,
    status text NOT NULL,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_score_check CHECK (((score >= 0) AND (score <= 100))),
    CONSTRAINT reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'revision_requested'::text, 'rejected'::text])))
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    cohort_id uuid NOT NULL,
    student_code text NOT NULL,
    phone text,
    status text NOT NULL,
    joining_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    profile_picture_url text,
    CONSTRAINT students_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text, 'graduated'::text])))
);


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    student_id uuid NOT NULL,
    submission_text text,
    file_url text,
    github_url text,
    live_url text,
    status text NOT NULL,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT submissions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'in_review'::text, 'approved'::text, 'revision_requested'::text, 'rejected'::text])))
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    cohort_id uuid NOT NULL,
    assigned_to uuid NOT NULL,
    assigned_by uuid NOT NULL,
    priority text NOT NULL,
    status text NOT NULL,
    due_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'done'::text])))
);


--
-- Name: admissions admissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_unique_student_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_unique_student_date UNIQUE (student_id, attendance_date);


--
-- Name: cohort_mentors cohort_mentors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohort_mentors
    ADD CONSTRAINT cohort_mentors_pkey PRIMARY KEY (cohort_id, mentor_id);


--
-- Name: cohorts cohorts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohorts
    ADD CONSTRAINT cohorts_pkey PRIMARY KEY (id);


--
-- Name: courses courses_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_code_unique UNIQUE (code);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: mentors mentors_mentor_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_mentor_code_key UNIQUE (mentor_code);


--
-- Name: mentors mentors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_pkey PRIMARY KEY (id);


--
-- Name: mentors mentors_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_profile_id_key UNIQUE (profile_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_submission_reviewer_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_submission_reviewer_unique UNIQUE (submission_id, reviewer_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_profile_id_key UNIQUE (profile_id);


--
-- Name: students students_student_code_unique_per_cohort; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_code_unique_per_cohort UNIQUE (cohort_id, student_code);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_task_student_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_task_student_unique UNIQUE (task_id, student_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: idx_attendance_cohort_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_cohort_id ON public.attendance USING btree (cohort_id);


--
-- Name: idx_attendance_mentor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_mentor_id ON public.attendance USING btree (mentor_id);


--
-- Name: idx_attendance_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_student_id ON public.attendance USING btree (student_id);


--
-- Name: idx_cohort_mentors_cohort_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cohort_mentors_cohort_id ON public.cohort_mentors USING btree (cohort_id);


--
-- Name: idx_cohort_mentors_mentor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cohort_mentors_mentor_id ON public.cohort_mentors USING btree (mentor_id);


--
-- Name: idx_cohorts_cohort_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_cohorts_cohort_code_unique ON public.cohorts USING btree (cohort_code);


--
-- Name: idx_courses_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_code ON public.courses USING btree (code);


--
-- Name: idx_courses_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_is_active ON public.courses USING btree (is_active);


--
-- Name: idx_courses_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_courses_slug_unique ON public.courses USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_mentors_manual_mentor_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_mentors_manual_mentor_code_unique ON public.mentors USING btree (manual_mentor_code) WHERE (manual_mentor_code IS NOT NULL);


--
-- Name: idx_mentors_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentors_profile_id ON public.mentors USING btree (profile_id);


--
-- Name: idx_profiles_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_profiles_email_unique ON public.profiles USING btree (email);


--
-- Name: idx_reviews_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_submission_id ON public.reviews USING btree (submission_id);


--
-- Name: idx_students_cohort_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_cohort_id ON public.students USING btree (cohort_id);


--
-- Name: idx_students_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_profile_id ON public.students USING btree (profile_id);


--
-- Name: idx_submissions_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_student_id ON public.submissions USING btree (student_id);


--
-- Name: idx_submissions_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_task_id ON public.submissions USING btree (task_id);


--
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);


--
-- Name: idx_tasks_cohort_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_cohort_id ON public.tasks USING btree (cohort_id);


--
-- Name: attendance attendance_cohort_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentors(id) ON DELETE RESTRICT;


--
-- Name: attendance attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;


--
-- Name: cohort_mentors cohort_mentors_cohort_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohort_mentors
    ADD CONSTRAINT cohort_mentors_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id) ON DELETE CASCADE;


--
-- Name: cohort_mentors cohort_mentors_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohort_mentors
    ADD CONSTRAINT cohort_mentors_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentors(id) ON DELETE CASCADE;


--
-- Name: cohorts cohorts_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohorts
    ADD CONSTRAINT cohorts_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: cohorts cohorts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohorts
    ADD CONSTRAINT cohorts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: cohorts cohorts_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohorts
    ADD CONSTRAINT cohorts_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentors(id) ON DELETE SET NULL;


--
-- Name: courses courses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: mentors mentors_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: mentors mentors_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: reviews reviews_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;


--
-- Name: students students_cohort_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id) ON DELETE RESTRICT;


--
-- Name: students students_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;


--
-- Name: submissions submissions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.students(id) ON DELETE RESTRICT;


--
-- Name: tasks tasks_cohort_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id) ON DELETE CASCADE;


--
-- Name: admissions Admin admissions only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin admissions only" ON public.admissions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: attendance Admin attendance all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin attendance all" ON public.attendance TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: cohort_mentors Admin cohort mentors all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin cohort mentors all" ON public.cohort_mentors TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: mentors Admin mentors all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin mentors all" ON public.mentors TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: reviews Admin reviews all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reviews all" ON public.reviews TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: students Admin students all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin students all" ON public.students TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: submissions Admin submissions all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin submissions all" ON public.submissions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: tasks Admin tasks all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin tasks all" ON public.tasks TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: courses Admins and superadmins can create courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and superadmins can create courses" ON public.courses FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));


--
-- Name: mentors Admins and superadmins can insert mentors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and superadmins can insert mentors" ON public.mentors FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));


--
-- Name: courses Admins and superadmins can update courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and superadmins can update courses" ON public.courses FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));


--
-- Name: mentors Admins and superadmins can update mentors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and superadmins can update mentors" ON public.mentors FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));


--
-- Name: mentors Admins and superadmins can view mentors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and superadmins can view mentors" ON public.mentors FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));


--
-- Name: courses All authenticated users can read courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can read courses" ON public.courses FOR SELECT TO authenticated USING (true);


--
-- Name: cohorts Cohorts delete for admin superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cohorts delete for admin superadmin" ON public.cohorts FOR DELETE TO authenticated USING ((public.current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text])));


--
-- Name: cohorts Cohorts insert for admin superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cohorts insert for admin superadmin" ON public.cohorts FOR INSERT TO authenticated WITH CHECK ((public.current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text])));


--
-- Name: cohorts Cohorts select for admin superadmin assigned mentor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cohorts select for admin superadmin assigned mentor" ON public.cohorts FOR SELECT TO authenticated USING (((public.current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text])) OR (mentor_id = public.current_mentor_id())));


--
-- Name: cohorts Cohorts update for admin superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cohorts update for admin superadmin" ON public.cohorts FOR UPDATE TO authenticated USING ((public.current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text]))) WITH CHECK ((public.current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text])));


--
-- Name: courses Courses select for portal roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Courses select for portal roles" ON public.courses FOR SELECT TO authenticated USING ((public.current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text, 'mentor'::text, 'student'::text])));


--
-- Name: attendance Mentor create assigned cohort attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor create assigned cohort attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (((mentor_id IN ( SELECT m.id
   FROM public.mentors m
  WHERE (m.profile_id = auth.uid()))) AND (cohort_id IN ( SELECT cm.cohort_id
   FROM (public.cohort_mentors cm
     JOIN public.mentors m ON ((m.id = cm.mentor_id)))
  WHERE (m.profile_id = auth.uid())))));


--
-- Name: reviews Mentor create assigned cohort reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor create assigned cohort reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (((reviewer_id = auth.uid()) AND (submission_id IN ( SELECT sb.id
   FROM (public.submissions sb
     JOIN public.tasks t ON ((t.id = sb.task_id)))
  WHERE (t.cohort_id IN ( SELECT cm.cohort_id
           FROM (public.cohort_mentors cm
             JOIN public.mentors m ON ((m.id = cm.mentor_id)))
          WHERE (m.profile_id = auth.uid())))))));


--
-- Name: tasks Mentor create assigned cohort tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor create assigned cohort tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (((assigned_by = auth.uid()) AND (cohort_id IN ( SELECT cm.cohort_id
   FROM (public.cohort_mentors cm
     JOIN public.mentors m ON ((m.id = cm.mentor_id)))
  WHERE (m.profile_id = auth.uid())))));


--
-- Name: attendance Mentor manage own attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor manage own attendance" ON public.attendance TO authenticated USING ((mentor_id = ( SELECT m.id
   FROM public.mentors m
  WHERE (m.profile_id = auth.uid())))) WITH CHECK ((mentor_id = ( SELECT m.id
   FROM public.mentors m
  WHERE (m.profile_id = auth.uid()))));


--
-- Name: reviews Mentor manage reviews for their tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor manage reviews for their tasks" ON public.reviews TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'mentor'::text)))) AND (reviewer_id = auth.uid()) AND (submission_id IN ( SELECT sub.id
   FROM public.submissions sub
  WHERE (sub.task_id IN ( SELECT t.id
           FROM public.tasks t
          WHERE (t.assigned_by = auth.uid()))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'mentor'::text)))) AND (reviewer_id = auth.uid()) AND (submission_id IN ( SELECT sub.id
   FROM public.submissions sub
  WHERE (sub.task_id IN ( SELECT t.id
           FROM public.tasks t
          WHERE (t.assigned_by = auth.uid())))))));


--
-- Name: tasks Mentor manage their tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor manage their tasks" ON public.tasks TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'mentor'::text)))) AND (assigned_by = auth.uid()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'mentor'::text)))) AND (assigned_by = auth.uid())));


--
-- Name: attendance Mentor read assigned cohort attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor read assigned cohort attendance" ON public.attendance FOR SELECT TO authenticated USING ((cohort_id IN ( SELECT cm.cohort_id
   FROM (public.cohort_mentors cm
     JOIN public.mentors m ON ((m.id = cm.mentor_id)))
  WHERE (m.profile_id = auth.uid()))));


--
-- Name: reviews Mentor read assigned cohort reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor read assigned cohort reviews" ON public.reviews FOR SELECT TO authenticated USING ((submission_id IN ( SELECT sb.id
   FROM (public.submissions sb
     JOIN public.tasks t ON ((t.id = sb.task_id)))
  WHERE (t.cohort_id IN ( SELECT cm.cohort_id
           FROM (public.cohort_mentors cm
             JOIN public.mentors m ON ((m.id = cm.mentor_id)))
          WHERE (m.profile_id = auth.uid()))))));


--
-- Name: submissions Mentor read assigned cohort submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor read assigned cohort submissions" ON public.submissions FOR SELECT TO authenticated USING ((task_id IN ( SELECT t.id
   FROM public.tasks t
  WHERE (t.cohort_id IN ( SELECT cm.cohort_id
           FROM (public.cohort_mentors cm
             JOIN public.mentors m ON ((m.id = cm.mentor_id)))
          WHERE (m.profile_id = auth.uid()))))));


--
-- Name: tasks Mentor read assigned cohort tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor read assigned cohort tasks" ON public.tasks FOR SELECT TO authenticated USING ((cohort_id IN ( SELECT cm.cohort_id
   FROM (public.cohort_mentors cm
     JOIN public.mentors m ON ((m.id = cm.mentor_id)))
  WHERE (m.profile_id = auth.uid()))));


--
-- Name: cohort_mentors Mentor read own cohort assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor read own cohort assignments" ON public.cohort_mentors FOR SELECT TO authenticated USING ((mentor_id IN ( SELECT m.id
   FROM public.mentors m
  WHERE (m.profile_id = auth.uid()))));


--
-- Name: mentors Mentor read own mentor row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor read own mentor row" ON public.mentors FOR SELECT TO authenticated USING ((profile_id = auth.uid()));


--
-- Name: students Mentor read students in assigned cohorts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor read students in assigned cohorts" ON public.students FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.mentors m
     JOIN public.profiles p ON ((p.id = m.profile_id)))
     JOIN public.cohorts c ON ((c.mentor_id = m.id)))
  WHERE ((p.id = auth.uid()) AND (p.role = 'mentor'::text) AND (c.id = students.cohort_id)))));


--
-- Name: submissions Mentor read/update submissions for their tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor read/update submissions for their tasks" ON public.submissions FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'mentor'::text)))) AND (task_id IN ( SELECT t.id
   FROM public.tasks t
  WHERE (t.assigned_by = auth.uid())))));


--
-- Name: attendance Mentor update assigned cohort attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor update assigned cohort attendance" ON public.attendance FOR UPDATE TO authenticated USING (((mentor_id IN ( SELECT m.id
   FROM public.mentors m
  WHERE (m.profile_id = auth.uid()))) AND (cohort_id IN ( SELECT cm.cohort_id
   FROM (public.cohort_mentors cm
     JOIN public.mentors m ON ((m.id = cm.mentor_id)))
  WHERE (m.profile_id = auth.uid()))))) WITH CHECK (((mentor_id IN ( SELECT m.id
   FROM public.mentors m
  WHERE (m.profile_id = auth.uid()))) AND (cohort_id IN ( SELECT cm.cohort_id
   FROM (public.cohort_mentors cm
     JOIN public.mentors m ON ((m.id = cm.mentor_id)))
  WHERE (m.profile_id = auth.uid())))));


--
-- Name: reviews Mentor update assigned cohort reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor update assigned cohort reviews" ON public.reviews FOR UPDATE TO authenticated USING (((reviewer_id = auth.uid()) AND (submission_id IN ( SELECT sb.id
   FROM (public.submissions sb
     JOIN public.tasks t ON ((t.id = sb.task_id)))
  WHERE (t.cohort_id IN ( SELECT cm.cohort_id
           FROM (public.cohort_mentors cm
             JOIN public.mentors m ON ((m.id = cm.mentor_id)))
          WHERE (m.profile_id = auth.uid()))))))) WITH CHECK (((reviewer_id = auth.uid()) AND (submission_id IN ( SELECT sb.id
   FROM (public.submissions sb
     JOIN public.tasks t ON ((t.id = sb.task_id)))
  WHERE (t.cohort_id IN ( SELECT cm.cohort_id
           FROM (public.cohort_mentors cm
             JOIN public.mentors m ON ((m.id = cm.mentor_id)))
          WHERE (m.profile_id = auth.uid())))))));


--
-- Name: submissions Mentor update assigned cohort submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor update assigned cohort submissions" ON public.submissions FOR UPDATE TO authenticated USING ((task_id IN ( SELECT t.id
   FROM public.tasks t
  WHERE (t.cohort_id IN ( SELECT cm.cohort_id
           FROM (public.cohort_mentors cm
             JOIN public.mentors m ON ((m.id = cm.mentor_id)))
          WHERE (m.profile_id = auth.uid())))))) WITH CHECK ((task_id IN ( SELECT t.id
   FROM public.tasks t
  WHERE (t.cohort_id IN ( SELECT cm.cohort_id
           FROM (public.cohort_mentors cm
             JOIN public.mentors m ON ((m.id = cm.mentor_id)))
          WHERE (m.profile_id = auth.uid()))))));


--
-- Name: tasks Mentor update assigned cohort tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor update assigned cohort tasks" ON public.tasks FOR UPDATE TO authenticated USING ((cohort_id IN ( SELECT cm.cohort_id
   FROM (public.cohort_mentors cm
     JOIN public.mentors m ON ((m.id = cm.mentor_id)))
  WHERE (m.profile_id = auth.uid())))) WITH CHECK ((cohort_id IN ( SELECT cm.cohort_id
   FROM (public.cohort_mentors cm
     JOIN public.mentors m ON ((m.id = cm.mentor_id)))
  WHERE (m.profile_id = auth.uid()))));


--
-- Name: submissions Mentor update submissions for their tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentor update submissions for their tasks" ON public.submissions FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'mentor'::text)))) AND (task_id IN ( SELECT t.id
   FROM public.tasks t
  WHERE (t.assigned_by = auth.uid()))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'mentor'::text)))) AND (task_id IN ( SELECT t.id
   FROM public.tasks t
  WHERE (t.assigned_by = auth.uid())))));


--
-- Name: mentors Mentors select for cohort access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentors select for cohort access" ON public.mentors FOR SELECT TO authenticated USING (((public.current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text])) OR (id = public.current_mentor_id())));


--
-- Name: courses Only superadmins can delete courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only superadmins can delete courses" ON public.courses FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'superadmin'::text)))));


--
-- Name: profiles Profiles management delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles management delete" ON public.profiles FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text])));


--
-- Name: profiles Profiles management insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles management insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text])));


--
-- Name: profiles Profiles management read all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles management read all" ON public.profiles FOR SELECT TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text])));


--
-- Name: profiles Profiles management update all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles management update all" ON public.profiles FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text])));


--
-- Name: profiles Profiles read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles read own profile" ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: profiles Profiles update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: submissions Student insert own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Student insert own submissions" ON public.submissions FOR INSERT TO authenticated WITH CHECK ((student_id IN ( SELECT s.id
   FROM public.students s
  WHERE (s.profile_id = auth.uid()))));


--
-- Name: submissions Student manage own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Student manage own submissions" ON public.submissions FOR INSERT TO authenticated WITH CHECK ((student_id IN ( SELECT s.id
   FROM public.students s
  WHERE (s.profile_id = auth.uid()))));


--
-- Name: attendance Student read own attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Student read own attendance" ON public.attendance FOR SELECT TO authenticated USING ((student_id IN ( SELECT s.id
   FROM public.students s
  WHERE (s.profile_id = auth.uid()))));


--
-- Name: reviews Student read own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Student read own reviews" ON public.reviews FOR SELECT TO authenticated USING ((submission_id IN ( SELECT sb.id
   FROM (public.submissions sb
     JOIN public.students st ON ((st.id = sb.student_id)))
  WHERE (st.profile_id = auth.uid()))));


--
-- Name: students Student read own student row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Student read own student row" ON public.students FOR SELECT TO authenticated USING ((profile_id = auth.uid()));


--
-- Name: submissions Student read own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Student read own submissions" ON public.submissions FOR SELECT TO authenticated USING ((student_id IN ( SELECT s.id
   FROM public.students s
  WHERE (s.profile_id = auth.uid()))));


--
-- Name: tasks Student read their tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Student read their tasks" ON public.tasks FOR SELECT TO authenticated USING ((assigned_to IN ( SELECT s.id
   FROM public.students s
  WHERE (s.profile_id = auth.uid()))));


--
-- Name: submissions Student update own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Student update own submissions" ON public.submissions FOR UPDATE TO authenticated USING ((student_id IN ( SELECT s.id
   FROM public.students s
  WHERE (s.profile_id = auth.uid())))) WITH CHECK ((student_id IN ( SELECT s.id
   FROM public.students s
  WHERE (s.profile_id = auth.uid()))));


--
-- Name: students Students select for cohort view access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students select for cohort view access" ON public.students FOR SELECT TO authenticated USING (((public.current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text, 'super admin'::text])) OR (profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.cohorts c
  WHERE ((c.id = students.cohort_id) AND (c.mentor_id = public.current_mentor_id()))))));


--
-- Name: admissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: cohort_mentors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cohort_mentors ENABLE ROW LEVEL SECURITY;

--
-- Name: cohorts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: mentors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict PUfgwkjSBol5yywhVxRW6lF9bh2I3k6hAZ6hwstJ6H895sIiazzTg0vwvEHhodq

