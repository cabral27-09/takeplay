-- Remover a constraint existente
ALTER TABLE producer_purchases DROP CONSTRAINT IF EXISTS producer_purchases_tier_check;

-- Recriar com o novo valor permitido
ALTER TABLE producer_purchases ADD CONSTRAINT producer_purchases_tier_check 
  CHECK (tier = ANY (ARRAY['produtor_anual'::text, 'produtor_semestral'::text, 'produtor_avulso'::text, 'admin_grant'::text]));