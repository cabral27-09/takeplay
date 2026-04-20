

## Validar que o limite global foi aplicado

Você ajustou o limite global no painel Storage Settings. Agora o caminho é simplesmente testar e confirmar que o upload de 2.4GB inicia normalmente.

## O que fazer agora

1. **Você** abre `/admin/upload` (ou a página de upload de produtor)
2. Seleciona o vídeo de 2.4GB novamente
3. Observa o comportamento:
   - **Sucesso esperado**: o upload sai de 0% e começa a subir, com progresso e velocidade visíveis
   - **Se falhar**: copia a mensagem de erro exata e me envia

## Se o upload começar mas falhar no meio

Possíveis causas e como vou tratar:
- **Erro de rede/timeout**: o TUS já tem retry configurado (`retryDelays: [0, 3000, 6000, 12000, 24000]`); deve recuperar sozinho
- **JWT expirando durante upload longo**: o `onBeforeRequest` já busca sessão fresca a cada chunk
- **Erro novo desconhecido**: vou inspecionar `network logs` e `edge function logs` para diagnosticar

## Se ainda falhar imediatamente em 0% com "Maximum size exceeded"

Significa que o ajuste no painel não foi salvo ou ainda está abaixo de 2.4GB. Vou orientar você a:
1. Conferir o valor exato salvo no painel (deve ser `6442450944` bytes ou `6 GB`)
2. Aguardar ~1 minuto para a config propagar
3. Tentar novamente

## Sem mudanças de código nesta etapa

Não há nada a alterar — código, bucket e RLS já estão corretos. Esta etapa é apenas validação do ajuste manual que você acabou de fazer.

