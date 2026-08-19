create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  agent_key text not null check (agent_key in ('operations_copilot')),
  request_key text not null check (char_length(request_key) between 8 and 200),
  provider text not null,
  model text not null,
  source text not null check (source in ('deterministic', 'openai')),
  input_hash text not null,
  input_summary jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  status text not null check (status in ('completed', 'failed', 'withheld')),
  created_at timestamptz not null default now(),
  unique (organization_id, request_key)
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  requested_by_user_id uuid not null references public.profiles(id) on delete restrict,
  proposal_key text not null,
  proposal_type text not null check (proposal_type in (
    'registration_review',
    'provider_delivery_review',
    'media_moderation'
  )),
  priority text not null check (priority in ('critical', 'high', 'normal')),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null check (char_length(summary) between 1 and 1000),
  rationale text not null check (char_length(rationale) between 1 and 1000),
  recommended_next_step text not null check (char_length(recommended_next_step) between 1 and 500),
  target_type text not null,
  target_id text,
  action_href text not null check (action_href in (
    '/admin/registrations',
    '/admin/message-delivery-review',
    '/admin/media-review'
  )),
  evidence_json jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_json) = 'array'),
  boundary text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by_user_id uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_run_id, proposal_key),
  check (
    (status = 'pending' and reviewed_by_user_id is null and reviewed_at is null)
    or
    (status <> 'pending' and reviewed_by_user_id is not null and reviewed_at is not null)
  )
);

create index if not exists agent_runs_organization_created_idx
  on public.agent_runs (organization_id, created_at desc);

create index if not exists approval_requests_organization_status_created_idx
  on public.approval_requests (organization_id, status, created_at desc);

alter table public.agent_runs enable row level security;
alter table public.approval_requests enable row level security;

revoke all on table public.agent_runs from public, anon, authenticated;
revoke all on table public.approval_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.agent_runs to service_role;
grant select, insert, update, delete on table public.approval_requests to service_role;

create or replace function public.create_operations_copilot_brief(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_request_key text,
  p_provider text,
  p_model text,
  p_source text,
  p_input_hash text,
  p_input_summary jsonb,
  p_output_json jsonb,
  p_proposals jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_run_id uuid;
  proposal jsonb;
  created_approval_ids uuid[] := '{}';
  created_approval_id uuid;
begin
  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = p_organization_id
      and membership.user_id = p_actor_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'active organization admin access required';
  end if;

  if p_source not in ('deterministic', 'openai') then
    raise exception 'unsupported operations copilot source';
  end if;

  select run.id into created_run_id
  from public.agent_runs run
  where run.organization_id = p_organization_id
    and run.request_key = p_request_key;

  if created_run_id is not null then
    select coalesce(array_agg(request.id order by request.created_at), '{}')
      into created_approval_ids
    from public.approval_requests request
    where request.agent_run_id = created_run_id;

    return jsonb_build_object(
      'agentRunId', created_run_id,
      'approvalRequestIds', to_jsonb(created_approval_ids),
      'reused', true
    );
  end if;

  if jsonb_typeof(p_proposals) <> 'array' or jsonb_array_length(p_proposals) > 8 then
    raise exception 'operations copilot proposals must be a bounded array';
  end if;

  insert into public.agent_runs (
    organization_id,
    actor_user_id,
    agent_key,
    request_key,
    provider,
    model,
    source,
    input_hash,
    input_summary,
    output_json,
    status
  ) values (
    p_organization_id,
    p_actor_user_id,
    'operations_copilot',
    p_request_key,
    left(p_provider, 80),
    left(p_model, 120),
    p_source,
    p_input_hash,
    coalesce(p_input_summary, '{}'::jsonb),
    coalesce(p_output_json, '{}'::jsonb),
    'completed'
  ) returning id into created_run_id;

  for proposal in select value from jsonb_array_elements(p_proposals)
  loop
    insert into public.approval_requests (
      organization_id,
      agent_run_id,
      requested_by_user_id,
      proposal_key,
      proposal_type,
      priority,
      title,
      summary,
      rationale,
      recommended_next_step,
      target_type,
      target_id,
      action_href,
      evidence_json,
      boundary
    ) values (
      p_organization_id,
      created_run_id,
      p_actor_user_id,
      proposal->>'proposalKey',
      proposal->>'proposalType',
      proposal->>'priority',
      proposal->>'title',
      proposal->>'summary',
      proposal->>'rationale',
      proposal->>'recommendedNextStep',
      proposal->>'targetType',
      nullif(proposal->>'targetId', ''),
      proposal->>'actionHref',
      coalesce(proposal->'evidence', '[]'::jsonb),
      proposal->>'boundary'
    ) returning id into created_approval_id;
    created_approval_ids := array_append(created_approval_ids, created_approval_id);
  end loop;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  ) values (
    p_organization_id,
    p_actor_user_id,
    'operations_copilot_brief_created',
    'agent_run',
    created_run_id::text,
    format('Operations Copilot created %s review-only proposal(s) from scoped operational counts.', cardinality(created_approval_ids))
  );

  return jsonb_build_object(
    'agentRunId', created_run_id,
    'approvalRequestIds', to_jsonb(created_approval_ids)
  );
end;
$$;

create or replace function public.review_operations_copilot_approval(
  p_approval_request_id uuid,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_decision text,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  reviewed_request public.approval_requests%rowtype;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'unsupported approval decision';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'review reason must contain at least 10 characters';
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = p_organization_id
      and membership.user_id = p_actor_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'active organization admin access required';
  end if;

  update public.approval_requests
  set
    status = p_decision,
    reviewed_by_user_id = p_actor_user_id,
    reviewed_at = now(),
    review_reason = left(trim(p_reason), 1000),
    updated_at = now()
  where id = p_approval_request_id
    and organization_id = p_organization_id
    and status = 'pending'
  returning * into reviewed_request;

  if reviewed_request.id is null then
    raise exception 'pending approval request not found';
  end if;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  ) values (
    p_organization_id,
    p_actor_user_id,
    'operations_copilot_proposal_' || p_decision,
    'approval_request',
    reviewed_request.id::text,
    format('Operations Copilot proposal %s. No underlying league action was executed.', p_decision)
  );

  return jsonb_build_object(
    'id', reviewed_request.id,
    'status', reviewed_request.status,
    'reviewedAt', reviewed_request.reviewed_at,
    'reviewReason', reviewed_request.review_reason
  );
end;
$$;

revoke all on function public.create_operations_copilot_brief(uuid, uuid, text, text, text, text, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.review_operations_copilot_approval(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_operations_copilot_brief(uuid, uuid, text, text, text, text, text, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.review_operations_copilot_approval(uuid, uuid, uuid, text, text) to service_role;
