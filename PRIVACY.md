# Privacidade

A extensão guarda no armazenamento local do Chrome o idioma da interface, as plataformas selecionadas, o país ou região, o modo de sorteio, os identificadores públicos das entradas sorteadas e a data e as contagens da última busca. **Reiniciar rodada** limpa o histórico da seleção atual.

O idioma da interface é aplicado localmente com as traduções incluídas na extensão.

Ao clicar no ícone, a extensão consulta as listagens das plataformas ativadas. Para ajustar a busca, ela pode enviar a região escolhida ao YouTube e o idioma associado à região à Twitch. São parâmetros da consulta. O histórico da rodada fica no navegador e as requisições de descoberta omitem cookies. Quando a live abre, valem as condições normais do navegador e da plataforma.

A tela de Opções pede a arte à Rockstar Games com o referrer desativado. A extensão funciona sem conta própria, analytics ou servidor intermediário.

## Permissões

| Permissão | Uso |
| --- | --- |
| `storage` | Guardar opções, rodadas e o status da última busca. |
| Acesso aos hosts Twitch, YouTube e Kick listados no [manifesto](manifest.json) | Consultar transmissões, categorias e metadados públicos quando a plataforma estiver habilitada. |
