-- Fase 7: el asistente clasifica cada respuesta con las categorías de la
-- especificación (DATO / SUPOSICIÓN / HIPÓTESIS / DECISIÓN / RESULTADO /
-- RECOMENDACIÓN). Se conservan los valores de 0008 para no romper filas viejas.
alter table public.ai_messages drop constraint if exists ai_messages_message_type_check;
alter table public.ai_messages
  add constraint ai_messages_message_type_check
  check (message_type is null or message_type in (
    'hecho','inferencia','recomendacion',
    'dato','suposicion','hipotesis','decision','resultado'
  ));
