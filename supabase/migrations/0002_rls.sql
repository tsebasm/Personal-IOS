-- Personal OS — Fase 1: Row Level Security.
-- Cada usuario solo puede leer/escribir sus propias filas. Sin excepciones,
-- sin rol de servicio usado desde el cliente: el anon key + RLS es toda la
-- barrera de seguridad, tal como pide el prompt ("un usuario no debe poder
-- acceder a datos de otro usuario").

-- PROFILES: dueño = id (no hay columna user_id, la PK es el propio auth.users.id)
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

alter table public.vision enable row level security;
create policy "vision_select_own" on public.vision for select using (auth.uid() = user_id);
create policy "vision_insert_own" on public.vision for insert with check (auth.uid() = user_id);
create policy "vision_update_own" on public.vision for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vision_delete_own" on public.vision for delete using (auth.uid() = user_id);

alter table public.areas enable row level security;
create policy "areas_select_own" on public.areas for select using (auth.uid() = user_id);
create policy "areas_insert_own" on public.areas for insert with check (auth.uid() = user_id);
create policy "areas_update_own" on public.areas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "areas_delete_own" on public.areas for delete using (auth.uid() = user_id);

alter table public.goals enable row level security;
create policy "goals_select_own" on public.goals for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals for delete using (auth.uid() = user_id);

alter table public.goal_metrics enable row level security;
create policy "goal_metrics_select_own" on public.goal_metrics for select using (auth.uid() = user_id);
create policy "goal_metrics_insert_own" on public.goal_metrics for insert with check (auth.uid() = user_id);
create policy "goal_metrics_update_own" on public.goal_metrics for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goal_metrics_delete_own" on public.goal_metrics for delete using (auth.uid() = user_id);

alter table public.projects enable row level security;
create policy "projects_select_own" on public.projects for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects for delete using (auth.uid() = user_id);

alter table public.milestones enable row level security;
create policy "milestones_select_own" on public.milestones for select using (auth.uid() = user_id);
create policy "milestones_insert_own" on public.milestones for insert with check (auth.uid() = user_id);
create policy "milestones_update_own" on public.milestones for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milestones_delete_own" on public.milestones for delete using (auth.uid() = user_id);

alter table public.tasks enable row level security;
create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id);

alter table public.task_dependencies enable row level security;
create policy "task_dependencies_select_own" on public.task_dependencies for select using (auth.uid() = user_id);
create policy "task_dependencies_insert_own" on public.task_dependencies for insert with check (auth.uid() = user_id);
create policy "task_dependencies_update_own" on public.task_dependencies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "task_dependencies_delete_own" on public.task_dependencies for delete using (auth.uid() = user_id);

alter table public.tags enable row level security;
create policy "tags_select_own" on public.tags for select using (auth.uid() = user_id);
create policy "tags_insert_own" on public.tags for insert with check (auth.uid() = user_id);
create policy "tags_update_own" on public.tags for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tags_delete_own" on public.tags for delete using (auth.uid() = user_id);

alter table public.task_tags enable row level security;
create policy "task_tags_select_own" on public.task_tags for select using (auth.uid() = user_id);
create policy "task_tags_insert_own" on public.task_tags for insert with check (auth.uid() = user_id);
create policy "task_tags_update_own" on public.task_tags for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "task_tags_delete_own" on public.task_tags for delete using (auth.uid() = user_id);

alter table public.habits enable row level security;
create policy "habits_select_own" on public.habits for select using (auth.uid() = user_id);
create policy "habits_insert_own" on public.habits for insert with check (auth.uid() = user_id);
create policy "habits_update_own" on public.habits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits_delete_own" on public.habits for delete using (auth.uid() = user_id);

alter table public.habit_logs enable row level security;
create policy "habit_logs_select_own" on public.habit_logs for select using (auth.uid() = user_id);
create policy "habit_logs_insert_own" on public.habit_logs for insert with check (auth.uid() = user_id);
create policy "habit_logs_update_own" on public.habit_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_logs_delete_own" on public.habit_logs for delete using (auth.uid() = user_id);

alter table public.inbox_items enable row level security;
create policy "inbox_items_select_own" on public.inbox_items for select using (auth.uid() = user_id);
create policy "inbox_items_insert_own" on public.inbox_items for insert with check (auth.uid() = user_id);
create policy "inbox_items_update_own" on public.inbox_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "inbox_items_delete_own" on public.inbox_items for delete using (auth.uid() = user_id);

alter table public.notes enable row level security;
create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes for delete using (auth.uid() = user_id);

alter table public.knowledge_items enable row level security;
create policy "knowledge_items_select_own" on public.knowledge_items for select using (auth.uid() = user_id);
create policy "knowledge_items_insert_own" on public.knowledge_items for insert with check (auth.uid() = user_id);
create policy "knowledge_items_update_own" on public.knowledge_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "knowledge_items_delete_own" on public.knowledge_items for delete using (auth.uid() = user_id);

alter table public.skills enable row level security;
create policy "skills_select_own" on public.skills for select using (auth.uid() = user_id);
create policy "skills_insert_own" on public.skills for insert with check (auth.uid() = user_id);
create policy "skills_update_own" on public.skills for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "skills_delete_own" on public.skills for delete using (auth.uid() = user_id);

alter table public.knowledge_links enable row level security;
create policy "knowledge_links_select_own" on public.knowledge_links for select using (auth.uid() = user_id);
create policy "knowledge_links_insert_own" on public.knowledge_links for insert with check (auth.uid() = user_id);
create policy "knowledge_links_update_own" on public.knowledge_links for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "knowledge_links_delete_own" on public.knowledge_links for delete using (auth.uid() = user_id);

alter table public.financial_accounts enable row level security;
create policy "financial_accounts_select_own" on public.financial_accounts for select using (auth.uid() = user_id);
create policy "financial_accounts_insert_own" on public.financial_accounts for insert with check (auth.uid() = user_id);
create policy "financial_accounts_update_own" on public.financial_accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "financial_accounts_delete_own" on public.financial_accounts for delete using (auth.uid() = user_id);

alter table public.transactions enable row level security;
create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

alter table public.debts enable row level security;
create policy "debts_select_own" on public.debts for select using (auth.uid() = user_id);
create policy "debts_insert_own" on public.debts for insert with check (auth.uid() = user_id);
create policy "debts_update_own" on public.debts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "debts_delete_own" on public.debts for delete using (auth.uid() = user_id);

alter table public.savings_goals enable row level security;
create policy "savings_goals_select_own" on public.savings_goals for select using (auth.uid() = user_id);
create policy "savings_goals_insert_own" on public.savings_goals for insert with check (auth.uid() = user_id);
create policy "savings_goals_update_own" on public.savings_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "savings_goals_delete_own" on public.savings_goals for delete using (auth.uid() = user_id);

alter table public.calendar_events enable row level security;
create policy "calendar_events_select_own" on public.calendar_events for select using (auth.uid() = user_id);
create policy "calendar_events_insert_own" on public.calendar_events for insert with check (auth.uid() = user_id);
create policy "calendar_events_update_own" on public.calendar_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "calendar_events_delete_own" on public.calendar_events for delete using (auth.uid() = user_id);

alter table public.reviews enable row level security;
create policy "reviews_select_own" on public.reviews for select using (auth.uid() = user_id);
create policy "reviews_insert_own" on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews_update_own" on public.reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_delete_own" on public.reviews for delete using (auth.uid() = user_id);

alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_insert_own" on public.notifications for insert with check (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications for delete using (auth.uid() = user_id);

alter table public.activity_logs enable row level security;
create policy "activity_logs_select_own" on public.activity_logs for select using (auth.uid() = user_id);
create policy "activity_logs_insert_own" on public.activity_logs for insert with check (auth.uid() = user_id);
create policy "activity_logs_update_own" on public.activity_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "activity_logs_delete_own" on public.activity_logs for delete using (auth.uid() = user_id);

