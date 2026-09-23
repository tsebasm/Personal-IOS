-- Asistente de IA: conversaciones + mensajes. Todo lo demás que la IA
-- necesita (metas, áreas, agencia, hábitos, vision...) ya existe — esto solo
-- guarda el historial de chat, para no perderlo entre sesiones.

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  type text not null default 'chat' check (type in ('chat','onboarding','daily_checkin','weekly_review')),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- message_type distingue lo que el propio modelo etiquetó como hecho
-- (citado de datos reales) de una inferencia o una recomendación —
-- solo aplica a mensajes del asistente; null en mensajes del usuario y en
-- texto conversacional simple que no afirma nada verificable.
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  role text not null check (role in ('user','assistant')),
  content text not null,
  message_type text check (message_type in ('hecho','inferencia','recomendacion')),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_conversations_user on public.ai_conversations(user_id, updated_at desc);
create index if not exists idx_ai_messages_conversation on public.ai_messages(conversation_id, created_at);

drop trigger if exists set_updated_at on public.ai_conversations;
create trigger set_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();
