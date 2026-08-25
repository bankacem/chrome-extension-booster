import json, os, glob, re

BASE = "/home/z/my-project/chrome-extension-booster/public/content"

SLUGS = [
    "chrome-extension-security-risks-permission-audit-guide",
    "chrome-extensions-that-slow-down-your-browser-real-tests",
    "zoom-chrome-extension-guide",
    "chrome-logger-debugging-guide",
    "chrome-extension-permissions-guide",
]

def partition(slug):
    return f"{slug[0]}/{slug[1]}/{slug[2]}"

# Read source English articles
source_articles = {}
for slug in SLUGS:
    p = f"{BASE}/articles/{partition(slug)}/{slug}.md"
    try:
        with open(p, "r") as f:
            source_articles[slug] = f.read()
    except:
        pass

# ===== PORTUGUESE TRANSLATIONS =====
PT_META = {
    "chrome-extension-security-risks-permission-audit-guide": {
        "seo_title": "Riscos de Segurança de Extensões do Chrome: Auditoria de 10 Minutos",
        "title": "Riscos de Segurança de Extensões do Chrome: Uma Auditoria de Permissões em 10 Minutos",
        "excerpt": "Aprenda a identificar riscos de segurança em extensões do Chrome, interpretar permissões, restringir acesso a sites e remover extensões injustificadas.",
        "category": "Segurança e Privacidade",
        "tags": ["segurança", "privacidade", "permissões", "auditoria", "extensões do chrome"],
        "keywords": ["riscos de segurança extensão chrome", "como verificar permissões extensão chrome", "extensões chrome são seguras", "auditoria de permissões extensão chrome"],
        "meta_description": "Identifique riscos de segurança de extensões do Chrome em 10 minutos. Aprenda a ler permissões, restringir acesso a sites, auditar atualizações e remover extensões arriscadas.",
    },
    "chrome-extensions-that-slow-down-your-browser-real-tests": {
        "seo_title": "Extensões do Chrome Lentas? Testes Reais de Desempenho",
        "title": "Extensões do Chrome Que Desaceleram Seu Navegador em 2026: Testes Reais de Desempenho",
        "excerpt": "Testamos 20 extensões populares do Chrome com o Gerenciador de Tarefas e medimos o impacto real de RAM e CPU. Confira os resultados.",
        "category": "Desempenho e Memória",
        "tags": ["desempenho", "memória", "ram", "cpu", "velocidade do navegador"],
        "keywords": ["extensões chrome lentas", "uso de memória extensão chrome", "quais extensões chrome usam mais ram", "navegador lento por causa de extensões"],
        "meta_description": "Testes reais com o Gerenciador de Tarefas do Chrome mostrando quais extensões mais consomem RAM e CPU em 2026. Dados reais, não suposições.",
    },
    "zoom-chrome-extension-guide": {
        "seo_title": "Guia da Extensão do Zoom para Chrome em 2026",
        "title": "Guia Completo da Extensão do Zoom para Chrome: Instalação e Dicas",
        "excerpt": "Guia passo a passo para instalar, configurar e usar a extensão do Zoom no Chrome para reuniões mais rápidas e produtivas.",
        "category": "Produtividade",
        "tags": ["zoom", "videoconferência", "reuniões", "chrome", "produtividade"],
        "keywords": ["extensão zoom chrome", "instalar zoom chrome", "zoom extensão navegador", "usar zoom no chrome"],
        "meta_description": "Guia completo da extensão do Zoom para Chrome em 2026. Aprenda a instalar, configurar e otimizar o Zoom diretamente no navegador.",
    },
    "chrome-logger-debugging-guide": {
        "seo_title": "Chrome Logger: Guia de Depuração para Desenvolvedores",
        "title": "Chrome Logger: Guia Completo de Depuração e Logging no Chrome",
        "excerpt": "Domine as ferramentas de logging e depuração do Chrome DevTools para encontrar bugs mais rápido e melhorar seu código.",
        "category": "Desenvolvimento",
        "tags": ["debugging", "logging", "devtools", "chrome", "desenvolvimento"],
        "keywords": ["chrome logger debug", "ferramentas depuração chrome", "chrome devtools console", "depuração javascript chrome"],
        "meta_description": "Guia completo de depuração e logging no Chrome. Aprenda a usar o Console, breakpoints e logs avançados para encontrar bugs mais rápido.",
    },
    "chrome-extension-permissions-guide": {
        "seo_title": "Guia de Permissões de Extensões do Chrome",
        "title": "Guia Completo de Permissões de Extensões do Chrome em 2026",
        "excerpt": "Entenda todas as permissões de extensões do Chrome, o que cada uma significa e como gerenciar o acesso das suas extensões.",
        "category": "Segurança e Privacidade",
        "tags": ["permissões", "segurança", "privacidade", "extensões do chrome", "manifest v3"],
        "keywords": ["permissões extensão chrome", "o que significam permissões chrome", "gerenciar permissões extensões", "manifest v3 permissões"],
        "meta_description": "Guia completo sobre permissões de extensões do Chrome em 2026. Entenda o que cada permissão faz e como proteger seus dados.",
    },
}

PT_BODIES = {
    "chrome-extension-security-risks-permission-audit-guide": """# Riscos de Segurança de Extensões do Chrome: Uma Auditoria de Permissões em 10 Minutos

As extensões do Chrome são fáceis de subestimar. Elas parecem pequenos acessórios do navegador, mas uma extensão é código executando dentro de uma sessão do navegador que pode conter seu e-mail, documentos de trabalho, contas de compras e abas bancárias. A pergunta importante não é se uma extensão é popular ou tem um ícone polido. É se o acesso que ela recebe faz sentido para a função que afirma realizar.

Este guia transforma os **riscos de segurança de extensões do Chrome** em um processo prático de decisão. Em cerca de dez minutos, você pode inventariar o que está instalado, comparar as permissões de cada extensão com seu propósito, reduzir o acesso desnecessário a sites e remover qualquer coisa que você não consiga justificar. O objetivo não é desativar toda ferramenta útil; é reduzir o acesso desnecessário enquanto mantém as extensões que genuinamente ajudam você.

## Por Que as Permissões Importam Mais Que as Avaliações

Uma extensão com 4,8 estrelas e milhões de downloads ainda pode representar um risco se solicitar permissões que excedem suas necessidades reais. As avaliações refletem funcionalidade e experiência do usuário, não segurança. Um bloqueador de anúncios que solicita acesso a todos os seus dados de navegação, ou um tema escuro que solicita acesso à sua lista de contatos, estão pedindo mais do que precisam.

O sistema de permissões do Chrome (Manifest V3) é a sua principal linha de defesa. Cada extensão declara suas permissões em um arquivo de manifesto, e o Chrome aplica essas restrições no nível do navegador. Quando uma extensão solicita `"host_permissions"` para `"*://*/*"`, isso significa acesso total a todos os sites que você visita. Muito poucas extensões precisam disso.

## A Auditoria de 10 Minutos: Passo a Passo

### Passo 1: Abra a Página de Extensões

Digite `chrome://extensions` na barra de endereço. Ative o "Modo do desenvolvedor" no canto superior direito. Isso revela informações detalhadas sobre cada extensão, incluindo seus diretórios de dados e permissões exatas.

### Passo 2: Liste Todas as Extensões Instaladas

Anote cada extensão e sua finalidade declarada. Você provavelmente descobrirá extensões que esqueceu que existiam. Para cada uma, pergunte: "Eu usei isso nos últimos 30 dias?" Se a resposta for não, marque-a para remoção.

### Passo 3: Clique em "Detalhes" e Verifique as Permissões

Para cada extensão, clique no botão "Detalhes". Role até a seção de permissões do site. Isso mostra exatamente quais sites a extensão pode acessar e quais APIs do navegador ela pode usar.

### Passo 4: Compare Permissões com a Finalidade

Aqui está a regra prática: se uma extensão de dicionário solicita acesso ao seu histórico de navegação, isso é um sinal vermelho. Se um gerenciador de senhas solicita acesso a formulários, isso é esperado e justificado.

### Passo 5: Restrinja o Acesso ao Site

O Chrome permite que você altere as permissões de acesso ao site de "Em todos os sites" para "Em sites específicos". Use isso. Uma extensão de tema escuro, por exemplo, não precisa acessar seu banco online.

## Permissões Comuns e O Que Elas Realmente Significam

| Permissão | O Que Faz | Risco Se Abusada |
|-----------|-----------|-------------------|
| `tabs` | Acessa URLs e títulos das abas | Médio - pode rastrear sua navegação |
| `bookmarks` | Lê e modifica seus favoritos | Baixo - inconveniente, não crítico |
| `history` | Acessa seu histórico completo | Alto - revela hábitos de navegação |
| `storage` | Armazena dados localmente | Baixo - isolado por extensão |
| `webRequest` | Intercepta solicitações de rede | Alto - pode ler/modificar tráfego |
| `clipboardRead` | Lê sua área de transferência | Alto - pode roubar dados copiados |

## Sinais de Alerta: Quando Remover Imediatamente

Remova uma extensão imediatamente se notar: acesso irrestrito a todos os sites sem justificativa clara, solicitação de permissões que não se relacionam com sua função, atualizações que adicionam permissões sem explicação, ou comportamento anormal como alto uso de CPU em segundo plano.

## Verificação de Atualizações

O Chrome atualiza extensões automaticamente, mas uma atualização pode adicionar novas permissões. Verifique `chrome://extensions` periodicamente para garantir que nenhuma extensão tenha silenciosamente expandido seu acesso.

## Perguntas Frequentes

**P: Extensões do Chrome podem roubar senhas?** Sim, se tiverem a permissão correta. Uma extensão com acesso a formulários e `webRequest` pode capturar credenciais. Use gerenciadores de senhas com extensões auditadas e de código aberto.

**P: O Manifest V3 é mais seguro que o V2?** Em teoria, sim. O Manifest V3 remove permissões perigosas como `webRequest` ilimitado e exige que o conteúdo do código seja declarado antecipadamente. Na prática, a segurança depende de quão bem o desenvolvedor segue essas restrições.

**P: Quantas extensões são muitas?** Se você tem mais de 10, provavelmente tem algumas que não usa. Cada extensão adicional aumenta sua superfície de ataque. Revise e remova regularmente.

A auditoria de permissões não é uma tarefa única. Faça isso a cada três meses ou sempre que instalar algo novo. Dez minutos de verificação podem evitar horas de dor de cabeça com contas comprometidas ou roubo de dados.""",

    "chrome-extensions-that-slow-down-your-browser-real-tests": """# Extensões do Chrome Que Desaceleram Seu Navegador em 2026: Testes Reais de Desempenho

A maioria das pessoas culpa seu hardware quando o Chrome começa a travar, congelar ou consumir gigabytes de RAM. Mas na maioria dos casos, os verdadeiros culpados são as extensões instaladas no navegador. Realizamos testes de desempenho reais em 20 das extensões mais populares do Chrome usando o Gerenciador de Tarefas integrado do Chrome (Shift+Esc) e aqui está o que encontramos.

A metodologia de teste foi simples: abrir um perfil limpo do Chrome, abrir 5 abas idênticas (sites de notícias e páginas de documentação), medir o uso basal de RAM e CPU, depois instalar uma extensão por vez e medir a diferença após 5 minutos de navegação normal. Cada teste foi repetido três vezes e a média foi calculada.

## Os Piores Ofensores: Extensões Que Arrastam Seu Navegador

### 1. Grammarly — Até 180MB Por Aba

Grammarly é uma das extensões mais pesadas que você pode instalar. Em cada aba onde ela ativa, adiciona entre 120MB e 180MB ao uso de memória do Chrome. O motivo é simples: o Grammarly executa um pipeline completo de PLN (Processamento de Linguagem Natural) em cada campo de texto que detecta, incluindo campos de entrada ocultos que você nunca interage. Se você tem 10 abas abertas com áreas de texto, são potencialmente 1,5GB de RAM apenas para verificação gramatical.

### 2. Honey — Até 150MB Por Aba

O Honey executa um processo em segundo plano que escaneia cada página que você visita em busca de códigos de cupom e comparações de preços. Ele injeta scripts no DOM da página e mantém conexões WebSocket com seus servidores. Em sites de e-commerce com layouts complexos, o Honey pode adicionar 100-150MB por aba.

### 3. LastPass — Até 120MB Por Aba

Gerenciadores de senhas são essenciais, mas o LastPass é mais pesado que a maioria das alternativas. Ele injeta ícones de preenchimento automático em cada campo de entrada de cada página, monitora envios de formulários e mantém uma conexão de cofre criptografado. O Bitwarden, em comparação, adiciona aproximadamente 40-60MB por aba para a mesma funcionalidade.

### 4. Extensões VPN — 90-200MB Por Aba

Qualquer extensão VPN que roteia seu tráfego através de um servidor proxy adiciona sobrecarga significativa. O uso de memória varia dependendo se a VPN está ativa e do volume de tráfego sendo processado. Quando inativa, ainda mantém conexões em segundo plano que consomem 40-60MB.

## Os Campeões Leves: Extensões Que Não Atrapalham

### 1. uBlock Origin — 15-40MB Por Aba

O uBlock Origin é consistentemente o bloqueador de anúncios mais leve testado. Seu mecanismo de filtragem estática (usando declarativeNetRequest no Manifest V3) delega a maior parte do trabalho para o código nativo do Chrome em vez de executar JavaScript em cada solicitação de rede.

### 2. Dark Reader — 20-35MB Por Aba

O Dark Reader inverte as cores da página para reduzir o cansaço visual. Ele faz isso através de injeção de CSS, que é computacionalmente barata. A pegada de memória permanece baixa mesmo em páginas complexas.

### 3. Privacy Badger — 10-25MB Por Aba

O Privacy Badger da EFF usa uma abordagem baseada em comportamento para bloquear rastreadores. Em vez de carregar listas de filtros massivas na memória, ele aprende quais domínios estão rastreando você enquanto navega. Isso significa uma pegada de memória inicial menor que cresce gradualmente.

## O Que Esses Números Significam na Prática

Em uma máquina com 8GB de RAM executando o Chrome com 15 abas e 8 extensões instaladas, apenas as extensões podem consumir 1,5-3GB de RAM. O Chrome em si precisa de aproximadamente 50-100MB por aba para renderização. O total pode facilmente atingir 4-6GB, deixando muito pouco espaço para outros aplicativos.

| Extensão | RAM Por Aba Ativa | RAM Por Aba em Segundo Plano | CPU Durante Navegação |
|-----------|-------------------|----------------------------|------------------------|
| Grammarly | 120-180MB | 30-50MB | 5-12% |
| Honey | 100-150MB | 20-40MB | 2-5% |
| LastPass | 80-120MB | 15-30MB | 1-3% |
| NordVPN | 90-200MB | 40-60MB | 3-8% |
| uBlock Origin | 15-40MB | 5-10MB | 0,5-1% |
| Dark Reader | 20-35MB | 5-15MB | 0,5-1% |
| Privacy Badger | 10-25MB | 5-10MB | 0,3-0,5% |

## Como Verificar Sua Própria Configuração Em Menos de Um Minuto

1. Abra o Chrome e pressione Shift+Esc para abrir o Gerenciador de Tarefas
2. Clique no cabeçalho da coluna "Memória" para ordenar por uso de memória
3. Navegue normalmente por 2-3 minutos
4. Verifique quais extensões aparecem no topo da lista
5. Desative a mais pesada e compare a capacidade de resposta do navegador

## Passos Práticos Para Reduzir o Impacto das Extensões

- **Remova extensões que não usou nos últimos 30 dias.** Se você esqueceu que ela existe, não precisa estar rodando.
- **Use permissões específicas por site.** O Chrome agora permite restringir extensões a sites específicos em vez de permitir em todos os sites.
- **Substitua ferramentas pesadas por alternativas leves.** Troque o LastPass pelo Bitwarden, o AdBlock Plus pelo uBlock Origin.
- **Use suspensores de abas.** Extensões como o ProTab Suspender descarregam automaticamente abas inativas.
- **Mantenha as extensões atualizadas.** Desenvolvedores otimizam regularmente o uso de memória.

## Perguntas Frequentes

**P: Extensões podem desacelerar o Chrome mesmo quando não estou usando ativamente?** Sim. Muitas extensões executam scripts em segundo plano que processam cada página que você visita ou mantêm conexões com servidores.

**P: Quantas extensões são muitas?** Não há um número fixo, mas como regra prática, se a memória total das suas extensões exceder 1GB durante a navegação normal, considere reduzir.

**P: O Manifest V3 torna as extensões mais leves?** Em muitos casos, sim. A API declarativeNetRequest move a correspondência de regras para o código nativo do Chrome, reduzindo a sobrecarga de JavaScript.

A conclusão principal é que nem todas as extensões são iguais em termos de uso de recursos. Algumas extensões pesadas podem anular o benefício de ter um computador rápido, enquanto alternativas leves fornecem a mesma funcionalidade sem o custo.""",

    "zoom-chrome-extension-guide": """# Guia Completo da Extensão do Zoom para Chrome: Instalação e Dicas

O Zoom se tornou uma das plataformas de videoconferência mais usadas do mundo, e sua extensão para Chrome permite iniciar e participar de reuniões diretamente do navegador sem abrir o aplicativo desktop. Isso é especialmente útil para usuários que trabalham em computadores corporativos restritos ou simplesmente preferem manter tudo no navegador.

## O Que a Extensão do Zoom para Chrome Faz

A extensão oficial do Zoom para Chrome oferece funcionalidades essenciais: agendar reuniões com um clique diretamente do navegador, participar de reuniões sem abrir o aplicativo desktop, compartilhar sua tela rapidamente durante chamadas, e receber notificações de reuniões iminentes. Ela atua como uma ponte entre o calendário do Google e o Zoom, permitindo que você transforme eventos do Google Calendar em reuniões do Zoom sem esforço.

## Como Instalar a Extensão do Zoom

### Método 1: Chrome Web Store

1. Abra a Chrome Web Store
2. Pesquise por "Zoom Scheduler"
3. Clique em "Usar no Chrome"
4. Confirme a instalação

### Método 2: Pelo Próprio Zoom

1. Faça login no Zoom no navegador
2. Vá para Configurações > Integração
3. Procure a opção do Chrome e clique em Instalar

## Configuração Após Instalação

Após instalar a extensão, você precisa conectá-la à sua conta do Zoom. Clique no ícone da extensão na barra do Chrome, faça login com suas credenciais do Zoom, e permita o acesso ao Google Calendar se solicitado. Isso permite que a extensão crie reuniões do Zoom diretamente dos eventos do calendário.

## Dicas para Melhorar o Uso do Zoom no Chrome

- **Ative o áudio apenas quando necessário.** Isso economiza banda de rede e reduz problemas de eco.
- **Use fundos virtuais.** A extensão suporta a aplicação de fundos virtuais sem precisar do aplicativo completo.
- **Atalhos de teclado.** Use Alt+M para silenciar/dessilenciar, Alt+V para ativar a câmera.
- **Gravação em nuvem.** Se sua conta suporta, habilite a gravação automática em nuvem nas configurações.

## Solução de Problemas Comuns

**A extensão não aparece na barra do Chrome:** Clique no ícone que parece um quebra-cabeça no canto superior direito do Chrome e fixe a extensão do Zoom.

**Não consigo compartilhar tela:** Verifique se o Chrome tem permissão para compartilhar tela nas configurações do sistema do seu computador.

**A reunião não abre automaticamente:** Verifique se a extensão está conectada à sua conta e se as permissões do Google Calendar estão concedidas.

## Extensão vs. Aplicativo Desktop: Qual Usar?

| Recurso | Extensão Chrome | Aplicativo Desktop |
|---------|-----------------|-------------------|
| Iniciar reuniões | Sim | Sim |
| Compartilhar tela | Sim | Sim |
| Gravar reunião | Não | Sim |
| Salas de reunião | Limitado | Completo |
| Webinars | Não | Sim |
| Fundos virtuais | Sim | Sim |

Para a maioria dos usuários que participam de reuniões, a extensão é suficiente. Se você organiza reuniões complexas com webinars ou precisa de gravação local, o aplicativo desktop ainda é necessário.

O Zoom no Chrome continua evoluindo com novos recursos sendo adicionados regularmente. A extensão é a maneira mais rápida de se conectar a reuniões sem deixar o navegador, tornando seu fluxo de trabalho mais fluido e eficiente.""",

    "chrome-logger-debugging-guide": """# Chrome Logger: Guia Completo de Depuração e Logging no Chrome

O Chrome DevTools é uma das ferramentas mais poderosas disponíveis para desenvolvedores web, e o painel de Console é onde a maior parte da depuração acontece. Seja você um desenvolvedor iniciante ou experiente, dominar as técnicas de logging do Chrome pode reduzir significativamente o tempo necessário para encontrar e corrigir bugs.

## Os Fundamentos do Console do Chrome

O Console do Chrome aceita vários métodos de log, cada um com um propósito específico. O mais comum é `console.log()`, mas existem variações mais poderosas que muitos desenvolvedores ignoram.

### console.log, console.warn, console.error

Estes são os três métodos básicos. `console.log()` exibe mensagens gerais em preto. `console.warn()` exibe avisos em amarelo. `console.error()` exibe erros em vermelho. Usar os métodos corretos ajuda a filtrar a saída rapidamente.

### console.table() para Dados Estruturados

Quando você precisa inspecionar arrays ou objetos, `console.table()` formata os dados como uma tabela interativa no console. Isso é muito mais legível do que `console.log` para dados tabulares.

```javascript
const extensions = [
  { nome: "uBlock", ram: 25 },
  { nome: "Dark Reader", ram: 30 },
  { nome: "Grammarly", ram: 150 },
];
console.table(extensions);
```

### console.group() e console.groupEnd()

Para organizar logs relacionados, use `console.group()` para criar um grupo recolhível e `console.groupEnd()` para fechá-lo. Isso mantém seu console limpo e organizado.

## Técnicas Avançadas de Depuração

### Breakpoints Condicional

No painel Sources, clique no número da linha para definir um breakpoint. Clique com o botão direito no breakpoint para torná-lo condicional. Você pode inserir uma expressão como `userId === 42` e a execução só será pausada quando essa condição for verdadeira.

### Logpoints

Os Logpoints são como breakpoints, mas em vez de pausar a execução, eles registram uma mensagem no console. Isso é útil quando você não quer interromper o fluxo de execução, mas precisa rastrear valores específicos.

### Monitor de Desempenho

O painel Performance permite gravar uma sessão de navegação e analisar onde o tempo está sendo gasto. Isso é essencial para identificar gargalos de renderização, scripts longos e layouts dispendiosos.

## Depuração de Extensões do Chrome

### Inspecionar o Background Script

Abra `chrome://extensions`, ative o modo do desenvolvedor, e clique em "Inspecionar visualizações: service worker" para abrir o DevTools do script em segundo plano da extensão. Isso permite depurar mensagens entre a extensão e as páginas de conteúdo.

### Inspecionar Content Scripts

Para depurar content scripts de uma extensão, abra o DevTools na página onde o content script está injetado. Os logs do content script aparecerão no console dessa página.

## Atalhos Essenciais

| Atalho | Ação |
|--------|------|
| Ctrl+Shift+I | Abrir DevTools |
| Ctrl+Shift+J | Abrir Console diretamente |
| Ctrl+Shift+C | Seletor de elementos |
| F8 | Continuar execução |
| F10 | Próxima linha |
| F11 | Entrar na função |
| Shift+F11 | Sair da função |

## Perguntas Frequentes

**P: Como limpar o console automaticamente?** Ative "Preservar log" nas configurações do console para manter os logs entre navegações, ou use `console.clear()` programaticamente.

**P: Posso depurar código minificado?** Sim, use o Pretty Print (ícone `{}`) no painel Sources para formatar o código minificado. Você também pode usar source maps se disponíveis.

**P: Como rastrear vazamentos de memória?** Use o painel Memory para tirar snapshots do heap e compará-los. O Chrome também tem o painel Performance Monitor para observar tendências de uso de memória ao longo do tempo.

Dominar as ferramentas de logging e depuração do Chrome é uma habilidade que se paga repetidamente. Os dez minutos que você investe em aprender console.table() e breakpoints condicionais hoje podem economizar horas de depuração amanhã.""",

    "chrome-extension-permissions-guide": """# Guia Completo de Permissões de Extensões do Chrome em 2026

Cada extensão do Chrome que você instala recebe um conjunto de permissões que determina o que ela pode e não pode fazer no seu navegador. Entender essas permissões é essencial para manter sua segurança online e proteger seus dados pessoais. Este guia explica cada tipo de permissão, o que ela significa na prática e como gerenciar o acesso das suas extensões.

## O Sistema de Permissões do Chrome (Manifest V3)

O Chrome usa um sistema de permissões baseado em manifesto. Cada extensão declara suas permissões necessárias em um arquivo chamado `manifest.json`. O navegador então aplica essas restrições, e o usuário pode revisar e modificar o acesso concedido a qualquer momento.

### Permissões Opcionais vs. Obrigatórias

No Manifest V3, as permissões são divididas em dois tipos. Permissões obrigatórias são concedidas automaticamente na instalação e a extensão não funciona sem elas. Permissões opcionais são solicitadas sob demanda quando a extensão precisa de acesso adicional. Isso dá ao usuário mais controle.

## Guia de Permissões Comuns

### Permissões de Hospedagem (Host Permissions)

Estas determinam quais sites uma extensão pode acessar. Uma permissão `"*://*/*"` dá acesso a todos os sites. Permissões como `"https://*.google.com/*"` são mais restritivas e específicas. Sempre prefira extensões que solicitam acesso apenas aos sites necessários.

### Permissões de API do Navegador

| Permissão | Descrição | Risco |
|-----------|-----------|-------|
| `tabs` | Acessa informações das abas | Médio |
| `bookmarks` | Gerencia seus favoritos | Baixo |
| `history` | Lê seu histórico de navegação | Alto |
| `downloads` | Gerencia downloads | Médio |
| `notifications` | Envia notificações | Baixo |
| `storage` | Armazena dados localmente | Baixo |
| `geolocation` | Acessa sua localização | Alto |
| `clipboardRead` | Lê a área de transferência | Alto |

### Permissões de Conteúdo

Content scripts são injetados diretamente nas páginas web. Eles podem modificar o DOM, interceptar solicitações de rede e acessar os cookies do site. Uma extensão pode declarar content scripts para corresponder a padrões de URL específicos.

## Como Gerenciar Permissões

### Verificar Permissões Atuais

1. Abra `chrome://extensions`
2. Clique em "Detalhes" de cada extensão
3. Revise a seção "Permissões do site"
4. Verifique a seção "Permissões"

### Restringir Acesso ao Site

1. Em "Detalhes" da extensão, role até "Permissões do site"
2. Altere de "Em todos os sites" para "Em sites específicos"
3. Adicione apenas os sites necessários

### Revogar Permissões Individuais

O Chrome permite remover permissões individuais sem desinstalar a extensão. Vá em Configurações > Extensões e gerencie o acesso de cada extensão.

## Melhores Práticas de Segurança

- **Revise as permissões antes de instalar.** Não clique em "Adicionar ao Chrome" sem verificar o que a extensão solicita.
- **Use o princípio do menor privilégio.** Dê a cada extensão apenas o acesso que ela estritamente precisa.
- **Audite regularmente.** Verifique suas extensões a cada três meses.
- **Prefira extensões de código aberto.** Código aberto pode ser auditado por qualquer pessoa.
- **Desative extensões não utilizadas.** Em vez de desinstalar, desative para manter o acesso se precisar no futuro.

## Perguntas Frequentes

**P: O que acontece se eu negar uma permissão necessária?** A extensão pode não funcionar corretamente ou pode solicitar a permissão novamente quando tentar usar um recurso que dela depende.

**P: Posso ver quais dados uma extensão acessou?** O Chrome não fornece um registro detalhado de acesso a dados por extensão. Use ferramentas de monitoramento de rede no DevTools para observar a atividade de rede de uma extensão.

**P: Extensões da Chrome Web Store são seguras?** Nem todas. A Google revisa extensões, mas o processo não é perfeito. Sempre verifique as permissões, independentemente da fonte.

Gerenciar permissões de extensões é uma parte essencial da segurança do navegador. Dedique alguns minutos para revisar suas extensões hoje e reduza sua superfície de ataque digital.""",
}

# ===== ARABIC TRANSLATIONS =====
AR_META = {
    "chrome-extension-security-risks-permission-audit-guide": {
        "seo_title": "مخاطر أمان إضافات كروم: تدقيق صلاحيات في 10 دقائق",
        "title": "مخاطر أمان إضافات كروم: دليل تدقيق الصلاحيات في 10 دقائق",
        "excerpt": "تعلّم كيفية اكتشاف مخاطر أمان إضافات كروم، وتفسير الصلاحيات، وتقييد الوصول إلى المواقع، وإزالة الإضافات غير المبررة.",
        "category": "الأمان والخصوصية",
        "tags": ["أمان", "خصوصية", "صلاحيات", "تدقيق", "إضافات كروم"],
        "keywords": ["مخاطر أمان إضافات كروم", "كيفية التحقق من صلاحيات إضافات كروم", "هل إضافات كروم آمنة", "تدقيق صلاحيات إضافات كروم"],
        "meta_description": "اكتشف مخاطر أمان إضافات كروم في 10 دقائق. تعلّم كيفية قراءة الصلاحيات وتقييد الوصول إلى المواقع وتدقيق التحديثات وإزالة الإضافات الخطرة.",
    },
    "chrome-extensions-that-slow-down-your-browser-real-tests": {
        "seo_title": "إضافات كروم تُبطئ المتصفح؟ اختبارات أداء حقيقية",
        "title": "إضافات كروم التي تُبطئ متصفحك في 2026: اختبارات أداء حقيقية",
        "excerpt": "اختبرنا 20 إضافة كروم شائعة باستخدام مدير المهام وقياسنا تأثير RAM وCPU الفعلي. إليك النتائج.",
        "category": "الأداء والذاكرة",
        "tags": ["أداء", "ذاكرة", "رام", "معالج", "سرعة المتصفح"],
        "keywords": ["إضافات كروم بطيئة", "استهلاك ذاكرة إضافات كروم", "أي إضافات كروم تستهلك أكثر", "متصفح بطيء بسبب الإضافات"],
        "meta_description": "اختبارات حقيقية باستخدام مدير مهام كروم تُظهر أي الإضافات تستهلك أكبر قدر من RAM وCPU في 2026. بيانات فعلية وليس تخمينات.",
    },
    "zoom-chrome-extension-guide": {
        "seo_title": "دليل إضافة زوم لمتصفح كروم 2026",
        "title": "الدليل الشامل لإضافة زوم لكروم: التثبيت والنصائح",
        "excerpt": "دليل خطوة بخطوة لتثبيت وإعداد واستخدام إضافة زوم في كروم لاجتماعات أسرع وأكثر إنتاجية.",
        "category": "الإنتاجية",
        "tags": ["زوم", "مؤتمرات فيديو", "اجتماعات", "كروم", "إنتاجية"],
        "keywords": ["إضافة زوم كروم", "تثبيت زوم كروم", "إضافة زوم المتصفح", "استخدام زوم في كروم"],
        "meta_description": "الدليل الشامل لإضافة زوم لكروم في 2026. تعلّم كيفية التثبيت والإعداد والاستفادة القصوى من زوم مباشرة في المتصفح.",
    },
    "chrome-logger-debugging-guide": {
        "seo_title": "أدوات تسجيل كروم: دليل التصحيح للمطورين",
        "title": "أدوات تسجيل كروم: الدليل الشامل للتصحيح والتسجيل في كروم",
        "excerpt": "أتقن أدوات التسجيل والتصحيح في Chrome DevTools للعثور على الأخطاء بسرعة وتحسين كودك.",
        "category": "التطوير",
        "tags": ["تصحيح", "تسجيل", "أدوات المطور", "كروم", "تطوير"],
        "keywords": ["تصحيح أخطاء كروم", "أدوات تصحيح كروم", "وحدة تحكم كروم", "تصحيح جافاسكريبت كروم"],
        "meta_description": "الدليل الشامل للتصحيح والتسجيل في كروم. تعلّم استخدام Console وbreakpoints والسجلات المتقدمة للعثور على الأخطاء بسرعة.",
    },
    "chrome-extension-permissions-guide": {
        "seo_title": "دليل صلاحيات إضافات كروم",
        "title": "الدليل الشامل لصلاحيات إضافات كروم في 2026",
        "excerpt": "فهم جميع صلاحيات إضافات كروم، وما يعنيه كل نوع منها، وكيفية إدارة وصول إضافاتك.",
        "category": "الأمان والخصوصية",
        "tags": ["صلاحيات", "أمان", "خصوصية", "إضافات كروم", "manifest v3"],
        "keywords": ["صلاحيات إضافات كروم", "معنى صلاحيات كروم", "إدارة صلاحيات الإضافات", "صلاحيات manifest v3"],
        "meta_description": "الدليل الشامل لصلاحيات إضافات كروم في 2026. افهم ما تفعله كل صلاحية وكيفية حماية بياناتك.",
    },
}

AR_BODIES = {
    "chrome-extension-security-risks-permission-audit-guide": """# مخاطر أمان إضافات كروم: دليل تدقيق الصلاحيات في 10 دقائق

من السهل الاستهانة بإضافات كروم. تبدو كملحقات صغيرة في المتصفح، لكن الإضافة هي كود يعمل داخل جلسة المتصفح التي قد تحتوي على بريدك الإلكتروني ومستندات العمل وحسابات التسوق وتبويبات الخدمات المصرفية. السؤال المهم ليس ما إذا كانت الإضافة شائعة أو تحتوي على أيقونة مصقولة. بل ما إذا كان الوصول الذي تحصل عليه منطقيًا للوظيفة التي تدّعي أداءها.

يحوّل هذا الدليل **مخاطر أمان إضافات كروم** إلى عملية اتخاذ قرار عملية. في حوالي عشر دقائق، يمكنك جرد ما هو مثبت، ومقارنة صلاحيات كل إضافة بغرضها، وتقليل الوصول غير الضروري إلى المواقع، وإزالة أي شيء لا تستطيع تبريره بثقة. الهدف ليس تعطيل كل أداة مفيدة؛ بل تقليل الوصول غير الضروري مع الحفاظ على الإضافات التي تساعدك حقًا.

## لماذا تهم الصلاحيات أكثر من التقييمات

قد تمثل الإضافة ذات 4.8 نجوم وملايين التنزيلات خطرًا إذا طلبت صلاحيات تتجاوز احتياجاتها الفعلية. تعكس التقييمات الوظائفية وتجربة المستخدم، وليس الأمان. مانع إعلانات يطلب الوصول إلى جميع بيانات التصفح، أو سمة داكنة تطلب الوصول إلى قائمة جهات الاتصال الخاصة بك، يطلبان أكثر مما يحتاجان.

نظام صلاحيات كروم (Manifest V3) هو خط الدفاع الرئيسي لك. كل إضافة تعلن عن صلاحياتها في ملف بيان، ويطبق كروم هذه القيود على مستوى المتصفح. عندما تطلب إضافة `"host_permissions"` لـ `"*://*/*"`، فهذا يعني وصول كامل إلى جميع المواقع التي تزورها. إضافات قليلة جدًا تحتاج إلى ذلك.

## تدقيق الصلاحيات في 10 دقائق: خطوة بخطوة

### الخطوة 1: افتح صفحة الإضافات

اكتب `chrome://extensions` في شريط العنوان. فعّل "وضع المطور" في الزاوية العلوية اليمنى. هذا يكشف معلومات تفصيلية عن كل إضافة.

### الخطوة 2: اذكر جميع الإضافات المثبتة

دوّن كل إضافة وغرضها المعلن. ستكتشف على الأرجح إضافات نسيت أنها موجودة. لكل واحدة، اسأل: "هل استخدمت هذا في آخر 30 يومًا؟" إذا كانت الإ answersلا، علّمها للإزالة.

### الخطوة 3: انقر على "التفاصيل" وتحقق من الصلاحيات

لكل إضافة، انقر على زر "التفاصيل". مرر لأسفل إلى قسم صلاحيات الموقع. هذا يظهر بالضبط المواقع التي يمكن للإضافة الوصول إليها.

### الخطوة 4: قارن الصلاحيات بالغرض

القاعدة العملية: إذا طلب قاموس إضافة الوصول إلى سجل التصفح الخاص بك، فهذا إشارة تحذيرية. إذا طلب مدير كلمات المرور الوصول إلى النماذج، فهذا متوقع ومبرر.

### الخطوة 5: قيّد الوصول إلى الموقع

يسمح كروم بتغيير صلاحيات الوصول إلى الموقع من "على جميع المواقع" إلى "على مواقع محددة". استخدم ذلك. سمة داكنة لا تحتاج إلى الوصول إلى حسابك البنكي عبر الإنترنت.

## صلاحيات شائعة وما تعنيه فعليًا

| الصلاحية | ما تفعله | المخاطر إذا أُسيء استخدامها |
|----------|----------|-------------------------------|
| `tabs` | الوصول إلى عناوين URL وعناوين التبويبات | متوسط - يمكن تتبع التصفح |
| `bookmarks` | قراءة وتعديل المفضلة | منخفض - مزعج وليس حرجًا |
| `history` | الوصول إلى سجل التصفح الكامل | مرتفع - يكشف عادات التصفح |
| `storage` | تخزين البيانات محليًا | منخفض - معزول لكل إضافة |
| `webRequest` | اعتراض طلبات الشبكة | مرتفع - يمكن قراءة/تعديل البيانات |
| `clipboardRead` | قراءة الحافظة | مرتفع - يمكن سرقة البيانات المنسوخة |

## علامات التحذير: متى تزيل فورًا

أزل إضافة فورًا إذا لاحظت: وصول غير مقيد إلى جميع المواقع بدون مبرر واضح، أو طلب صلاحيات لا تتعلق بوظيفتها، أو تحديثات تضيف صلاحيات بدون شرح، أو سلوك غير طبيعي مثل ارتفاع استهلاك المعالج في الخلفية.

## أسئلة شائعة

**س: هل يمكن لإضافات كروم سرقة كلمات المرور؟** نعم، إذا كانت تمتلك الصلاحية المناسبة. استخدم مديري كلمات مرور ذوي كود مفتوح ومُدقّقين.

**س: هل Manifest V3 أكثر أمانًا من V2؟** من الناحية النظرية نعم. يزيل V3 صلاحيات خطيرة ويطلب التصريح المسبق بكود المحتوى.

**س: كم عدد الإضافات كثير؟** إذا كان لديك أكثر من 10 إضافات، فربما لديك بعض التي لا تستخدمها. كل إضافة إضافية تزيد سطح الهجوم.

تدقيق الصلاحيات ليس مهمة لمرة واحدة. قم بذلك كل ثلاثة أشهر أو كلما ثبّت شيئًا جديدًا. عشر دقائق من الفحص يمكن أن تمنع ساعات من الصداع مع الحسابات المخترقة.""",

    "chrome-extensions-that-slow-down-your-browser-real-tests": """# إضافات كروم التي تُبطئ متصفحك في 2026: اختبارات أداء حقيقية

يلوم معظم الناس الأجهزة عندما يبدأ كروم في التأخير والتجميد واستهلاك غيغابايت من الذاكرة. لكن في معظم الحالات، المذنبون الحقيقيون هم الإضافات المثبتة في المتصفح. أجرينا اختبارات أداء حقيقية على 20 إضافة كروم شائعة باستخدام مدير المهام المدمج في كروم (Shift+Esc) وإليك ما وجدنا.

كانت منهجية الاختبار مباشرة: فتح ملف تعريف كروم نظيف، وفتح 5 تبويبات متطابقة (مواقع إخبارية وصفحات توثيق)، وقياس الذاكرة والمعالج الأساسيين، ثم تثبيت إضافة واحدة في كل مرة وقياس الفرق بعد 5 دقائق من التصفح الطبيعي. كل اختبار تكرر ثلاث مرات وأُخذ المتوسط.

## الأسوأ: إضافات تُثقل متصفحك

### 1. Grammarly — حتى 180 ميجابايت لكل تبويب

Grammarly هي واحدة من أثقل الإضافات التي يمكنك تثبيتها. في كل تبويب تُفعّل فيه، تضيف بين 120 و180 ميجابايت إلى استهلاك ذاكرة كروم. السبب بسيط: Grammarly يشغّل مسار معالجة لغوية طبيعية كاملًا في كل حقل نص يكتشفه، بما في ذلك حقول الإدخال المخفية التي قد لا تتفاعل معها أبدًا. إذا كان لديك 10 تبويبات مفتوحة تحتوي على مناطق نصية، فهذا يعني 1.5 غيغابايت من الذاكرة فقط للتدقيق النحوي.

### 2. Honey — حتى 150 ميجابايت لكل تبويب

يشغّل Honey عملية خلفية تفحص كل صفحة تزورها بحثًا عن أكواد الخصم ومقارنات الأسعار. يحقن نصوصًا برمجية في DOM الصفحة ويحافظ على اتصالات WebSocket بخوادمه.

### 3. LastPass — حتى 120 ميجابايت لكل تبويب

مديرو كلمات المرور ضروريون، لكن LastPass أثقل من معظم البدائل. يحقق Bitwarden تقريبًا 40-60 ميجابايت لكل تبويب لنفس الوظيفة.

### 4. إضافات VPN — 90-200 ميجابايت لكل تبويب

أي إضافة VPN تُوجّه حركتك عبر خادم وكيل تضيف عبئًا كبيرًا.

## الأخف وزنًا: إضافات لا تُسبب مشاكل

### 1. uBlock Origin — 15-40 ميجابايت لكل تبويب

uBlock Origin هو باستمرار أخف مانع إعلانات مُختبر. يُفوّض محرك التصفية الثابت معظم العمل إلى الكود الأصلي لكروم بدلاً من تشغيل JavaScript في كل طلب شبكة.

### 2. Dark Reader — 20-35 ميجابايت لكل تبويب

يعكس Dark Reader ألوان الصفحة لتقليل إجهاد العين عبر حقن CSS، وهو حسابي رخيص.

### 3. Privacy Badger — 10-25 ميجابايت لكل تبويب

يستخدم Privacy Badger من EFF نهجًا قائمًا على السلوك لحظر المتتبعين. بدلاً من تحميل قوائم تصفية ضخمة في الذاكرة، يتعلّم النطاقات التي تتبعك أثناء التصفح.

## ما تعنيه هذه الأرقام عمليًا

على جهاز بذاكرة 8 غيغابايت يشغّل كروم مع 15 تبويب و8 إضافات، يمكن للإضافات وحدها استهلاك 1.5-3 غيغابايت. إجمالي الاستهلاك يمكن أن يصل بسهولة إلى 4-6 غيغابايت.

| الإضافة | الذاكرة لكل تبويب نشط | الذاكرة لكل تبويب خلفي | المعالج أثناء التصفح |
|---------|----------------------|------------------------|---------------------|
| Grammarly | 120-180 م.ب | 30-50 م.ب | 5-12% |
| Honey | 100-150 م.ب | 20-40 م.ب | 2-5% |
| LastPass | 80-120 م.ب | 15-30 م.ب | 1-3% |
| NordVPN | 90-200 م.ب | 40-60 م.ب | 3-8% |
| uBlock Origin | 15-40 م.ب | 5-10 م.ب | 0.5-1% |
| Dark Reader | 20-35 م.ب | 5-15 م.ب | 0.5-1% |
| Privacy Badger | 10-25 م.ب | 5-10 م.ب | 0.3-0.5% |

## كيفية فحص إعداداتك في أقل من دقيقة

1. افتح كروم واضغط Shift+Esc لفتح مدير المهام
2. انقر على رأس عمود "الذاكرة" للترتيب حسب الاستهلاك
3. تصفّح بشكل طبيعي لمدة 2-3 دقائق
4. تحقق من الإضافات في أعلى القائمة
5. عطّل الأثقل وقارن استجابة المتصفح

## خطوات عملية لتقليل تأثير الإضافات

- **أزل الإضافات التي لم تستخدمها في 30 يومًا.** إذا نسيت أنها موجودة، لا تحتاج إلى أن تكون عاملة.
- **استخدم صلاحيات محددة لكل موقع.** يسمح كروم الآن بتقييد الإضافات على مواقع محددة.
- **استبدل الأدوات الثقيلة ببدائل خفيفة.** بدّل من LastPass إلى Bitwarden، ومن AdBlock Plus إلى uBlock Origin.
- **استخدم معلّقات التبويبات.** تُفرّغ إضافات مثل ProTab Suspender التبويبات غير النشطة تلقائيًا.

## أسئلة شائعة

**س: هل يمكن للإضافات إبطاء كروم حتى عندما لا أستخدمها بنشاط؟** نعم. العديد من الإضافات تشغّل نصوصًا برمجية في الخلفية تعالج كل صفحة تزورها.

**س: كم عدد الإضافات كثير؟** لا يوجد رقم ثابت، لكن كقاعدة عملية، إذا تجاوز إجمالي ذاكرة إضافاتك 1 غيغابايت أثناء التصفح العادي، ففكر في التقليص.

**س: هل يجعل Manifest V3 الإضافات أخف؟** في كثير من الحالات نعم. تنقل API التعريفي مطابقة القواعد إلى كود كروم الأصلي.

الخلاصة الرئيسية هي أن ليس جميع الإضافات متساوية في استهلاك الموارد. بضع إضافات ثقيلة يمكن أن تُلغي فائدة امتلاك جهاز سريع، بينما البدائل الخفيفة توفر نفس الوظيفة بدون التكلفة.""",

    "zoom-chrome-extension-guide": """# الدليل الشامل لإضافة زوم لكروم: التثبيت والنصائح

أصبح زوم أحد أكثر منصات المؤتمرات المرئية استخدامًا في العالم، وتتيح إضافته لكروم بدء الاجتماعات والمشاركة فيها مباشرة من المتصفح دون فتح تطبيق سطح المكتب. هذا مفيد بشكل خاص للمستخدمين الذين يعملون على أجهزة شركة مقيدة أو يفضلون البقاء في المتصفح.

## ما تفعله إضافة زوم لكروم

توفر إضافة زوم الرسمية لكروم وظائف أساسية: جدولة الاجتماعات بنقرة واحدة مباشرة من المتصفح، والمشاركة في الاجتماعات دون فتح تطبيق سطح المكتب، ومشاركة شاشتك بسرعة أثناء المكالمات، واستلام إشعارات بالاجتماعات القادمة. تعمل كجسر بين تقويم جوجل وزوم.

## كيفية تثبيت إضافة زوم

### الطريقة 1: Chrome Web Store

1. افتح Chrome Web Store
2. ابحث عن "Zoom Scheduler"
3. انقر على "استخدام في Chrome"
4. أكد التثبيت

### الطريقة 2: من زوم نفسه

1. سجّل الدخول إلى زوم في المتصفح
2. انتقل إلى الإعدادات > التكامل
3. ابحث عن خيار كروم وانقر على تثبيت

## الإعداد بعد التثبيت

بعد تثبيت الإضافة، تحتاج إلى ربطها بحسابك في زوم. انقر على أيقونة الإضافة في شريط كروم، سجّل الدخول ببيانات اعتماد زوم، واسمح بالوصول إلى تقويم جوجل إذا طُلب ذلك.

## نصائح لتحسين استخدام زوم في كروم

- **فعّل الصوت فقط عند الحاجة.** هذا يوفر عرض النطاق الترددي ويقلل مشاكل الصدى.
- **استخدم خلفيات افتراضية.** تدعم الإضافة تطبيق الخلفيات الافتراضية دون الحاجة للتطبيق الكامل.
- **اختصارات لوحة المفاتيح.** استخدم Alt+M لكتم/إلغاء كتم الصوت، وAlt+V لتفعيل الكاميرا.
- **التسجيل السحابي.** إذا كان حسابك يدعم ذلك، فعّل التسجيل التلقائي السحابي في الإعدادات.

## حل المشاكل الشائعة

**الإضافة لا تظهر في شريط كروم:** انقر على أيقونة شكل قطعة puzzel في الزاوية العلوية اليمنى وثبّت إضافة زوم.

**لا أستطيع مشاركة الشاشة:** تحقق من أن كروم لديه إذن مشاركة الشاشة في إعدادات النظام.

## الإضافة مقابل تطبيق سطح المكتب: أيهما تستخدم؟

| الميزة | إضافة كروم | تطبيق سطح المكتب |
|--------|-----------|-----------------|
| بدء الاجتماعات | نعم | نعم |
| مشاركة الشاشة | نعم | نعم |
| تسجيل الاجتماع | لا | نعم |
| غرف الاجتماعات | محدود | كامل |
| الندوات عبر الويب | لا | نعم |
| الخلفيات الافتراضية | نعم | نعم |

للمعظمين الذين يشاركون في الاجتماعات، الإضافة كافية. إذا كنت تنظم اجتماعات معقدة أو تحتاج إلى تسجيل محلي، فتطبيق سطح المكتب لا يزال ضروريًا.

زوم في كروم يستمر في التطور مع إضافة ميزات جديدة بانتظام. الإضافة هي أسرع طريقة للاتصال بالاجتماعات دون مغادرة المتصفح.""",

    "chrome-logger-debugging-guide": """# أدوات تسجيل كروم: الدليل الشامل للتصحيح والتسجيل في كروم

Chrome DevTools هي واحدة من أقوى الأدوات المتاحة لمطوري الويب، ولوحة وحدة التحكم هي حيث يحدث معظم التصحيح. سواء كنت مطورًا مبتدئًا أو خبيرًا، فإن إتقان تقنيات التسجيل في كروم يمكن أن يقلل بشكل كبير من الوقت اللازم للعثور على الأخطاء وإصلاحها.

## أساسيات وحدة تحكم كروم

تقبل وحدة تحكم كروم عدة طرق تسجيل، لكل منها هدف محدد. الأكثر شيوعًا هو `console.log()`، لكن هناك تطورات أقوى يتجاهلها كثيرون.

### console.log و console.warn و console.error

هذه الطرق الثلاثة الأساسية. `console.log()` يعرض رسائل عامة. `console.warn()` يعرض تحذيرات باللون الأصفر. `console.error()` يعرض أخطاء باللون الأحمر. استخدام الطرق الصحيحة يساعد في تصفية المخرجات بسرعة.

### console.table() للبيانات المهيكلة

عند الحاجة إلى فحص المصفوفات أو الكائنات، `console.table()` ينسّق البيانات كجدول تفاعلي في وحدة التحكم.

```javascript
const extensions = [
  { name: "uBlock", ram: 25 },
  { name: "Dark Reader", ram: 30 },
  { name: "Grammarly", ram: 150 },
];
console.table(extensions);
```

### console.group() و console.groupEnd()

لتنظيم السجلات ذات الصلة، استخدم `console.group()` لإنشاء مجموعة قابلة للطي و `console.groupEnd()` لإغلاقها.

## تقنيات التصحيح المتقدمة

### نقاط التوقف الشرطية

في لوحة Sources، انقر على رقم السطر لتحديد نقطة توقف. انقر بزر الماوس الأيمن لجعلها شرطية. أدخل تعبيرًا مثل `userId === 42` وسيتم إيقاف التنفيذ فقط عندما يكون الشرط صحيحًا.

### Logpoints

Logpoints تشبه نقاط التوقف لكنها تسجل رسالة في وحدة التحكم بدلاً من إيقاف التنفيذ. مفيدة عندما لا تريد مقاطعة التنفيذ بل تريد تتبع قيم محددة.

### مراقب الأداء

لوحة Performance تسمح بتسجيل جلسة تصفح وتحليل أين يُقضى الوقت. هذا أساسي لتحديد اختناقات العرض والنصوص الطويلة.

## تصحيح إضافات كروم

### فحص السكربت الخلفي

افتح `chrome://extensions`، فعّل وضع المطور، وانقر على "فحص: عامل الخدمة" لفتح DevTools الخاص بالإضافة.

### فحص نصوص المحتوى

لتصحيح content scripts، افتح DevTools في الصفحة التي يتم حقن النص البرمجي فيها.

## الاختصارات الأساسية

| الاختصار | الإجراء |
|---------|---------|
| Ctrl+Shift+I | فتح DevTools |
| Ctrl+Shift+J | فتح وحدة التحكم مباشرة |
| Ctrl+Shift+C | محدد العناصر |
| F8 | متابعة التنفيذ |
| F10 | السطر التالي |
| F11 | الدخول إلى الدالة |
| Shift+F11 | الخروج من الدالة |

## أسئلة شائعة

**س: كيف أمحو وحدة التحكم تلقائيًا؟** فعّل "الحفاظ على السجل" في إعدادات وحدة التحكم.

**س: هل يمكنني تصحيح كود مُضغّط؟** نعم، استخدم Pretty Print في لوحة Sources لتنسيق الكود. يمكنك أيضًا استخدام source maps إذا كانت متوفرة.

**س: كيف أتتبع تسرب الذاكرة؟** استخدم لوحة Memory لأخذ لقطات الكومة ومقارنتها.

إتقان أدوات التسجيل والتصحيح في كروم هي مهمة تدفع ثمنها مرارًا. الدقائق العشر التي تستثمرها في تعلم console.table() ونقاط التوقف الشرطية اليوم يمكن أن توفر ساعات من التصحيح غدًا.""",

    "chrome-extension-permissions-guide": """# الدليل الشامل لصلاحيات إضافات كروم في 2026

كل إضافة كروم تثبّتها تحصل على مجموعة من الصلاحيات التي تحدد ما يمكنها وما لا يمكنها فعله في متصفحك. فهم هذه الصلاحيات ضروري للحفاظ على أمانك على الإنترنت وحماية بياناتك الشخصية.

## نظام صلاحيات كروم (Manifest V3)

يستخدم كروم نظام صلاحيات مبني على البيان. كل إضافة تعلن عن صلاحياتها المطلوبة في ملف يُسمى `manifest.json`. ثم يطبق المتصفح هذه القيود، ويمكنك مراجعة وتعديل الوصول الممنوح في أي وقت.

### الصلاحيات الاختيارية مقابل الإلزامية

في Manifest V3، الصلاحيات مقسمة إلى نوعين. الصلاحيات الإلزامية تُمنح تلقائيًا عند التثبيت ولا تعمل الإضافة بدونها. الصلاحيات الاختيارية تُطلب عند الحاجة عندما تحتاج الإضافة إلى وصول إضافي. هذا يعطيك تحكمًا أكبر.

## دليل الصلاحيات الشائعة

### صلاحيات الاستضافة (Host Permissions)

هذه تحدد المواقع التي يمكن للإضافة الوصول إليها. صلاحية `"*://*/*"` تعطي وصولاً إلى جميع المواقع. صلاحيات مثل `"https://*.google.com/*"` أكثر تقييدًا. فضّل دائمًا الإضافات التي تطلب الوصول فقط إلى المواقع الضرورية.

### صلاحيات واجهة برمجة المتصفح

| الصلاحية | الوصف | المخاطر |
|----------|-------|---------|
| `tabs` | الوصول إلى معلومات التبويبات | متوسط |
| `bookmarks` | إدارة المفضلة | منخفض |
| `history` | قراءة سجل التصفح | مرتفع |
| `downloads` | إدارة التنزيلات | متوسط |
| `notifications` | إرسال إشعارات | منخفض |
| `storage` | تخزين البيانات محليًا | منخفض |
| `geolocation` | الوصول إلى موقعك | مرتفع |
| `clipboardRead` | قراءة الحافظة | مرتفع |

### صلاحيات المحتوى

يتم حقن نصوص المحتوى مباشرة في صفحات الويب. يمكنها تعديل DOM واعتراض طلبات الشبكة والوصول إلى ملفات تعريف الارتباط للموقع.

## كيفية إدارة الصلاحيات

### فحص الصلاحيات الحالية

1. افتح `chrome://extensions`
2. انقر على "التفاصيل" لكل إضافة
3. راجع قسم "صلاحيات الموقع"
4. تحقق من قسم "الصلاحيات"

### تقييد الوصول إلى الموقع

1. في "التفاصيل"، مرر لأسفل إلى "صلاحيات الموقع"
2. غيّر من "على جميع المواقع" إلى "على مواقع محددة"
3. أضف فقط المواقع الضرورية

## أفضل ممارسات الأمان

- **راجع الصلاحيات قبل التثبيت.** لا تنقر على "إضافة إلى كروم" دون التحقق مما تطلبه الإضافة.
- **استخدم مبدأ الامتيازات الأدنى.** أعطِ كل إضافة فقط الوصول الذي تحتاجه تمامًا.
- **راجع بانتظام.** افحص إضافاتك كل ثلاثة أشهر.
- **فضّل الإضافات مفتوحة المصدر.** الكود المفتوح يمكن تدقيقه من أي شخص.
- **عطّل الإضافات غير المستخدمة.** بدلاً من إلغاء التثبيت، عطّلها.

## أسئلة شائعة

**س: ماذا يحدث إذا رفضت صلاحية مطلوبة؟** قد لا تعمل الإضافة بشكل صحيح أو قد تطلب الصلاحية مرة أخرى.

**س: هل يمكنني رؤية البيانات التي وصلت إليها إضافة؟** لا يوفر كروم سجل تفصيلي لكل إضافة. استخدم أدوات مراقبة الشبكة في DevTools.

**س: هل إضافات Chrome Web Store آمنة؟** ليست كلها. Google تراجع الإضافات لكن العملية ليست مثالية.

إدارة صلاحيات الإضافات جزء أساسي من أمان المتصفح. خذ بضع دقائق لمراجعة إضافاتك اليوم وقلّل سطح هجومك الرقمي.""",
}

def build_frontmatter(slug, meta, lang_code, locale):
    return f"""---
seo_title: "{meta['seo_title']}"
id: "{slug}-{lang_code}"
title: "{meta['title']}"
slug: "{slug}"
excerpt: "{meta['excerpt']}"
featured_image: /content/images/{slug}/featured.webp
category: "{meta['category']}"
tags: {json.dumps(meta['tags'], ensure_ascii=False)}
keywords:
""" + '\n'.join(f'  - {kw}' for kw in meta['keywords']) + f"""
meta_description: "{meta['meta_description']}"
status: published
published_at: "2026-08-26T12:00:00+01:00"
scheduled_at: "2026-08-26T12:00:00+01:00"
author: "ExtensionTo"
read_time: 8
created_at: "2026-08-26"
updated_at: "2026-08-26"
locale: "{locale}"
---

"""

def write_articles(lang, meta_dict, bodies_dict, locale):
    index_entries = []
    for slug in SLUGS:
        meta = meta_dict[slug]
        body = bodies_dict[slug]
        part = partition(slug)
        dir_path = f"{BASE}/i18n/{lang}/articles/{part}"
        os.makedirs(dir_path, exist_ok=True)
        md = build_frontmatter(slug, meta, lang, locale) + body
        with open(f"{dir_path}/{slug}.md", "w") as f:
            f.write(md)
        entry = {
            "slug": slug,
            "title": meta["title"],
            "seo_title": meta["seo_title"],
            "excerpt": meta["excerpt"],
            "featured_image": f"/content/images/{slug}/featured.webp",
            "category": meta["category"],
            "tags": meta["tags"],
            "keywords": meta["keywords"],
            "meta_description": meta["meta_description"],
            "published_at": "2026-08-26T12:00:00+01:00",
            "author": "ExtensionTo",
            "read_time": 8,
        }
        index_entries.append(entry)
        print(f"  Written: {lang}/{slug}.md")

    idx_path = f"{BASE}/i18n/{lang}/articles-index.json"
    with open(idx_path, "w") as f:
        json.dump(index_entries, f, ensure_ascii=False, indent=2)
    print(f"  Written: {lang}/articles-index.json ({len(index_entries)} articles)")

print("Generating Portuguese translations...")
write_articles("pt", PT_META, PT_BODIES, "pt_BR")

print("\nGenerating Arabic translations...")
write_articles("ar", AR_META, AR_BODIES, "ar_SA")

print("\nDone!")