-- Meta diaria de prospección en frío (ej. "20 mensajes al día") — vive en
-- agencia_settings junto a vant_goal_id: es config estructural, una fila por
-- usuario, igual que el resto de esa tabla.
alter table public.agencia_settings
  add column if not exists daily_outreach_target integer
  check (daily_outreach_target is null or daily_outreach_target >= 0);
