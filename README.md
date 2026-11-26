# DECUPA — Decupagem visual

Aplicativo web genérico de organização audiovisual. Comece com um projeto vazio; cadastre cenas, fotografe/adapte referências visuais e organize ordens do dia.

## Recursos
- Projetos independentes, sem cenas pré-cadastradas
- Cenas com ação, enquadramento/movimento, locação, necessidades e notas
- Upload de múltiplas referências fotográficas por cena, com legenda
- Ordenação e duplicação de cenas
- Uma ou mais ordens do dia com horários, locações, atividades e participantes
- Exportação direta de PDF (biblioteca html2pdf.js via CDN; fallback para impressão)
- Backup e restauração JSON
- Salvamento local pelo IndexedDB do navegador

## Publicação
Projeto estático em um único `index.html`, hospedado no Vercel e conectado à branch `main`. Alterações na branch serão implantadas pelo Vercel.

## Privacidade e armazenamento
Os dados, incluindo fotos, permanecem apenas no navegador do dispositivo utilizado. **Não há conta, login ou sincronização entre dispositivos.** Use **Backup JSON** para cópias de segurança e transferência. O PDF é gerado no próprio navegador e não armazenado em servidor.

Esta aplicação **não** contém cenas ou imagens pré-cadastradas do projeto Forró do ABC.
