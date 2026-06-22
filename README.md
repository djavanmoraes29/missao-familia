# 🏠 Missão Família

App de gamificação de responsabilidades para adolescentes.

---

## 🚀 Rodar localmente

```bash
npm install
npm run dev
```
Acesse: http://localhost:5173

---

## 📦 Publicar no Vercel

```bash
npm install -g vercel
npm run build
vercel --prod
```

---

## ✏️ Personalizar

Edite o arquivo `src/App.jsx`:

| O que mudar | Onde |
|---|---|
| Nome da filha | Linha com `Sofia` (comentário `👆`) |
| Nome da família | Linha com `Família Silva` (comentário `👆`) |
| Tarefas iniciais | Constante `TASKS_INIT` no topo |
| Recompensas iniciais | Constante `REWARDS_INIT` no topo |
| XP inicial (demo) | `useState(120)` no final do arquivo |

---

## 🔄 Atualizar o app publicado

Após editar qualquer arquivo:

```bash
vercel --prod
```

Ou, se estiver conectado ao GitHub:
```bash
git add .
git commit -m "atualização"
git push
```
O Vercel faz o deploy automaticamente.

---

## 📱 Funcionalidades

**Adolescente**
- ⚡ Missões diárias com XP
- 🛒 Loja de recompensas
- 🏆 Troféus e medalhas
- Sistema de níveis (Aprendiz → Líder)

**Pais**
- 📊 Visão geral com progresso semanal
- ✅ Criar e remover tarefas
- 🎁 Criar e remover recompensas

---

## 🛠️ Próximas melhorias sugeridas

- [ ] Salvar progresso no localStorage
- [ ] Enviar notificação por WhatsApp ao completar tarefas
- [ ] Página de histórico dos últimos 30 dias
- [ ] Modo multi-filhos
- [ ] PWA (instalar como app no celular)
