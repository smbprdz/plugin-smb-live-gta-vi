# Como contribuir

Use os [formulários de Issues](https://github.com/smbprdz/plugin-smb-live-gta-vi/issues/new/choose) para relatar um problema ou sugerir uma melhoria. Um bug de descoberta fica mais fácil de investigar com a versão da extensão, a plataforma, o país selecionado e os passos para reproduzir. Como lives terminam, inclua o horário aproximado e o link público da transmissão quando ajudarem no diagnóstico.

## Desenvolvimento local

1. Faça um fork, clone e crie uma branch a partir de `main`.
2. Em `chrome://extensions`, carregue a raiz do checkout em **Carregar sem compactação**.
3. Depois de alterar o código, use **Recarregar** na extensão. Teste o clique na barra e as opções afetadas.
4. Rode `node --test` com Node.js 22 ou mais recente. A suíte usa dados sintéticos e dispensa chaves ou conexões externas.
5. Abra um pull request com a mudança, o cenário reproduzido e o que foi verificado no Chrome.

Ao alterar um adapter, preserve o funcionamento das outras plataformas quando a fonte falhar. Ao ajustar os sinais regionais, documente a evidência e inclua um caso ambíguo junto do caso positivo. Use links públicos ou exemplos sintéticos ao anexar evidências.
