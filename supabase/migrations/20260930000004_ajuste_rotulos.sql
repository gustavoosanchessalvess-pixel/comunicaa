-- =====================================================================
-- CAA · MIGRAÇÃO 4 · AJUSTE DE RÓTULO
-- ---------------------------------------------------------------------
-- "Ir no banheiro" vira "Banheiro". Em PECS/CAA os cartões são palavras
-- curtas e concretas (de preferência um substantivo); a frase se monta
-- juntando cartões: "Eu" + "Quero" + "Banheiro". Um cartão com a ação
-- inteira ("Ir no banheiro") é mais difícil de reconhecer e de combinar.
-- Só o texto muda: a figura, o id e as ligações continuam iguais.
-- =====================================================================
update public.palavras_pecs
set txt_palavra = 'Banheiro'
where id_palavra = 37 and txt_palavra = 'Ir no banheiro';
