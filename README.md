# SMB Live GTA VI

Extensão para Chrome que abre, com um clique, uma live de **Grand Theft Auto VI em português do Brasil** na Twitch, no YouTube ou na Kick. É a versão GTA VI do [SMB Live Zomboid](https://github.com/smbprdz/plugin-smb-live-zomboid).

## Instalação

1. [Baixe o ZIP](https://github.com/smbprdz/plugin-smb-live-gta-vi/archive/refs/heads/main.zip) e extraia a pasta do repositório.
2. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta que contém `manifest.json`.
4. Fixe **SMB Live GTA VI** na barra de ferramentas. Clique no ícone para sortear. O botão direito abre as **Opções**.

## Sorteio

- A live sorteada abre diretamente em nova aba. As três plataformas começam ligadas e podem ser configuradas nas Opções.
- O sorteio percorre as entradas descobertas na rodada, com a mesma chance para cada entrada disponível e sem peso por audiência.
- Cada transmissão ocupa uma vaga por padrão. O modo por criador aproxima a identidade pelo nome de usuário e pode deixar de agrupar perfis com nomes diferentes. Cada modo mantém a sua rodada.
- **Reiniciar rodada** limpa o histórico do modo selecionado. As Opções exibem quantas entradas já saíram e o resultado da última busca.
- Se uma plataforma falhar, as transmissões encontradas nas outras continuam no sorteio.

## Cobertura do Brasil

| Plataforma | Como entra uma live |
| --- | --- |
| Twitch | Categoria Grand Theft Auto VI, filtro Português e sinais públicos de PT-BR. |
| Kick | Categoria Grand Theft Auto VI, idioma declarado e sinais públicos de PT-BR. |
| YouTube | Busca de lives em andamento com GTA VI ou GTA 6 no título e sinais públicos de PT-BR. |

O recorte PT-BR fica ativo em todos os sorteios. A extensão usa os metadados disponíveis para estimar idioma e público, então pode omitir lives brasileiras com informações insuficientes. A cobertura depende das listagens, da paginação disponível e dos limites de busca de cada plataforma. O contador de uma consulta parcial informa quantas entradas elegíveis apareceram naquela consulta. As consultas usam uma memória temporária de até 45 segundos no worker.

## Código e arte

A extensão usa Manifest V3, JavaScript e armazenamento local, sem conta, servidor próprio ou configuração de chave de API. Consulte [PRIVACY.md](PRIVACY.md) e [NOTICE.md](NOTICE.md).

O código usa a licença MIT. A arte **Jason and Lucia Rooftop** vem da galeria oficial da Rockstar Games, por referência direta. Projeto independente de fãs. [Galeria de GTA VI](https://www.rockstargames.com/VI/media)
