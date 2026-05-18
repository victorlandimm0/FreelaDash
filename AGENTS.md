# FreelaDash

## Projeto

FreelaDash é um dashboard pessoal para freelancers gerenciarem clientes, projetos, registros de horas e cobranças em BRL. A experiência principal começa em `/dashboard` após login.

## Stack

- Next.js com TypeScript e App Router
- SQLite local em `%TEMP%/FreelaDash/freeladash.db` por padrão
- Tailwind CSS com componentes próprios no estilo shadcn
- Autenticação por email/senha e Google OAuth
- Validação de APIs com Zod

## Comandos

- `npm run dev`: inicia o servidor de desenvolvimento
- `npm run seed`: recria/popula o banco com dados fictícios
- `npm run check`: roda checagem TypeScript
- `npm run build`: gera build de produção

No PowerShell deste ambiente, se `npm` for bloqueado pela política de scripts, use `npm.cmd`.

## Dados Locais

O schema fica em `database/schema.sql` e é usado tanto pela aplicação quanto pelo seed. Por padrão, o arquivo SQLite fica fora da pasta sincronizada pelo OneDrive, em `%TEMP%/FreelaDash/freeladash.db`, porque SQLite precisa gravar journal/locks com liberdade. Defina `SQLITE_PATH` para trocar o local. O seed recria o banco e gera:

- usuário de teste: `ana@freeladash.dev`
- senha de teste: `123456`
- 3 clientes
- 5 projetos
- 20 registros de horas nos últimos 30 dias

## Autenticação

Rotas públicas:

- `/login`
- `/register`
- `/api/auth/*`

Todo o restante passa pelo middleware e redireciona para `/login` quando não houver sessão válida. O login por Google exige `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`.

## Convenções

- Sempre filtrar dados por `user_id` em consultas e APIs.
- Datas de formulário usam `YYYY-MM-DD`; exibição usa `pt-BR`.
- Valores monetários são salvos em centavos.
- Não versionar `data/*.db`, `.env` ou `node_modules`.
