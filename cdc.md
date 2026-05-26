# Cahier des Charges — Dashboard SaaS de Génération de Contenu Social & Blog

> Rédigé le 2026-05-13  
> Basé sur l'analyse du projet RénoPilote (implémentation de référence)

---

## 1. RÔLE ET CONTEXTE

Application **Dashboard SaaS** permettant à un utilisateur de :
- Générer des articles de blog complets via LLM
- Générer des posts adaptés à plusieurs réseaux sociaux (Instagram, Facebook, Twitter/X, LinkedIn, Telegram) depuis plusieurs sources (texte brut, URL web, PDF)
- Générer des illustrations IA contextuelles associées à chaque post et chaque article
- Gérer et personnaliser tous les prompts système depuis une interface dédiée
- Configurer les fournisseurs d'IA et leurs clés API sans toucher au code

### Stack technique de référence (projet RénoPilote)
| Couche | Technologie | Notes |
|--------|-------------|-------|
| Framework | Next.js 15+ (App Router) | `output: 'standalone'` pour le mode Windows |
| Langage | TypeScript 5 | Strict mode |
| Style | Tailwind CSS v4 + shadcn/ui | Composants accessibles |
| Icons | lucide-react | |
| BDD | Supabase (PostgreSQL) | + localStorage comme cache client |
| Email | Resend | Optionnel |
| Auth | Supabase Auth | Optionnel selon périmètre |

---

## 2. ARCHITECTURE GÉNÉRALE

### 2.1 Structure des dossiers cibles
```
src/
├── app/
│   ├── dashboard/           # Page principale (entrée données + génération)
│   ├── admin/
│   │   ├── blog/            # Gestion articles + génération sociale
│   │   ├── redaction/       # Rédaction/génération article
│   │   ├── prompts/         # Éditeur de prompts système
│   │   ├── ai-config/       # Sélection providers + modèles
│   │   └── settings/        # Config globale
│   └── api/
│       └── ai/
│           ├── chat/        # Route POST → génération texte
│           ├── image/       # Route POST → génération image
│           ├── providers/   # Route GET → statut des clés API
│           ├── scrape/      # Route POST → extraction contenu URL
│           └── pdf/         # Route POST → extraction texte PDF
├── lib/
│   └── ai/
│       ├── provider-manager.ts   # Singleton AIProviderManager
│       ├── server-keys.ts        # Mapping clés API (serveur uniquement)
│       └── prompts-default.ts    # Prompts par défaut centralisés
├── components/
│   ├── social/              # Cards réseau social (texte + image)
│   ├── blog/                # Cards article
│   └── ui/                  # Composants shadcn/ui
└── context/
    └── AIConfigContext.tsx  # Provider config AI global
```

### 2.2 Pattern singleton AIProviderManager
Reproduire l'architecture du projet de référence :
- Classe `AIProviderManager` instanciée une seule fois côté serveur
- Méthodes publiques clairement séparées par domaine fonctionnel :
  - `draftArticle()` — rédaction blog
  - `enrichArticleContent()` — mise en forme (gras, structure)
  - `generateSocialContent(article, platform, provider)` — post réseau social
  - `generateImageDescription(title, content)` — description visuelle depuis article
  - `generateImage(prompt, provider, aspectRatio)` — image finale
  - `scrapeUrl(url)` — extraction contenu web
  - `extractPdfText(buffer)` — extraction texte PDF
- Fallback automatique vers données mock si clé API absente (pas d'erreur bloquante)

---

## 3. FONCTIONNALITÉS CORE

### 3.1 Page Dashboard — Entrée de données multimodale (`/dashboard`)

**Sélecteur de source (3 onglets) :**

| Onglet | Input | Traitement backend |
|--------|-------|-------------------|
| Texte | `<textarea>` texte brut | Aucun — utilisé directement |
| Lien Web | `<input type="url">` + bouton "Analyser" | `POST /api/ai/scrape` → extraction contenu principal (sans menus/pubs/footer) |
| Documents PDF | Dropzone drag & drop, multi-fichiers | `POST /api/ai/pdf` → extraction texte intégrale côté serveur (pas côté client) |

**Extraction URL :** utiliser `cheerio` ou `@mozilla/readability` + `jsdom` pour isoler le contenu éditorial principal.  
**Extraction PDF :** utiliser `pdf-parse` ou `pdfjs-dist` côté serveur uniquement.

---

### 3.2 Génération de posts réseaux sociaux

**Réseaux supportés :** Instagram, Facebook, Twitter/X, LinkedIn, Telegram

> Note : le projet de référence supporte Twitter, LinkedIn, Instagram, Telegram.  
> **Facebook est à ajouter** en suivant exactement le même pattern (prompt dédié `social_facebook` + style image `social_facebook_style`).

**Flux de génération (2 étapes, reproduire le pattern du projet de référence) :**

```
Source (texte/URL/PDF)
│
├─ Étape 1 : generateImageDescription(title, content)
│   → LLM produit une description visuelle ≤ 50 mots
│
└─ Étape 2 : Pour chaque réseau
    ├─ generateSocialContent(source, platform, provider)
    │   → LLM avec PROMPT_REDACTION_{NETWORK} + source content
    │   → Retourne le texte du post adapté au réseau
    │
    └─ generateImage(description + PROMPT_STYLE_{NETWORK}, provider, aspectRatio)
        → Image contextualisée par plateforme
```

**Contraintes par réseau :**
| Réseau | Max caractères | Hashtags | Ton | Ratio image |
|--------|---------------|----------|-----|-------------|
| Twitter/X | 280 | 2-3 | Percutant, dynamique | 16:9 |
| LinkedIn | 3000 | 3-5 | Professionnel, structuré | 1:1 |
| Instagram | 2200 | 10-15 | Lifestyle, visuel-first | 1:1 |
| Facebook | 500 recommandés | 2-3 | Conversationnel, engageant | 1:1 |
| Telegram | 1000 | 0-2 | Informatif, direct | 1:1 |

**Affichage en grille :**
- Grille 2×3 (ou 3×2 selon responsive) avec une card par réseau
- Chaque card : logo réseau + texte éditable inline + compteur caractères + bouton Copier + bouton "Générer l'illustration"
- Couleur d'accent par réseau (Twitter = #1DA1F2, LinkedIn = #0A66C2, etc.)

---

### 3.3 Génération d'illustrations par IA

**Pipeline deux étapes (identique au projet de référence) :**
1. Description textuelle générée par LLM depuis le contenu source
2. Description + template de style → envoi au provider image

**Providers image supportés (minimum 2 distincts, conformément au CDC) :**
| Provider | Modèles | Usage recommandé |
|----------|---------|-----------------|
| OpenAI DALL-E 3 | `dall-e-3` | Style réaliste/corporate |
| Google Imagen | `imagen-3.0`, `imagen-3.0-fast` | Style photo propre |
| Leonardo AI | Phoenix, Flux Schnell, Seedream | Styles artistiques variés |
| Freepik AI | Mystic Realism v2 | Style illustratif |
| Fal.ai | `flux/dev`, `flux/schnell` | Génération rapide |

L'utilisateur doit pouvoir :
- Choisir le provider par défaut dans `/admin/ai-config`
- Lancer la génération sur un provider spécifique depuis chaque card
- Télécharger l'image en PNG
- Prévisualiser le prompt final avant envoi (bouton "Voir le prompt")

---

### 3.4 Génération d'articles de blog (`/admin/redaction`)

**Pipeline :**
1. Saisie du sujet / topics
2. Sélection ton + longueur
3. `draftArticle()` → brouillon complet structuré en Markdown
4. `enrichArticleContent()` → enrichissement : gras stratégiques, sous-titres, reformulation
5. `generateImage()` → illustration article
6. Publication → Supabase + cache localStorage

**Paramètres configurables :**
- Ton : Expert & Rassurant / Pédagogique / Commercial / Neutre
- Longueur : Court (400-600 mots) / Moyen (800-1200 mots) / Long (1500-2500 mots)

---

### 3.5 Page Prompts (`/admin/prompts`)

**Liste complète des prompts paramétrables :**

| ID Prompt | Usage |
|-----------|-------|
| `article_drafting` | Rédaction article complet |
| `article_enrichment` | Post-traitement : gras, structure |
| `image_description_generator` | Étape 1 génération image (description depuis contenu) |
| `article_image_style` | Template style image pour articles |
| `social_twitter` | Texte post Twitter/X |
| `social_linkedin` | Texte post LinkedIn |
| `social_instagram` | Texte post Instagram |
| `social_facebook` | Texte post Facebook |
| `social_telegram` | Texte post Telegram |
| `social_twitter_style` | Style image Twitter |
| `social_linkedin_style` | Style image LinkedIn |
| `social_instagram_style` | Style image Instagram |
| `social_facebook_style` | Style image Facebook |
| `social_telegram_style` | Style image Telegram |
| `research_veille` | Veille / recherche web |
| `PROMPT_SYSTEM_GLOBAL` | Contexte métier global, ton de marque, cible |

**Fonctionnalités de la page :**
- Textarea pleine largeur par prompt, avec sauvegarde automatique (debounce 1s) ou bouton "Sauvegarder"
- Bouton "Réinitialiser aux valeurs par défaut" par prompt (valeurs dans `prompts-default.ts`)
- Bouton "Optimiser via IA" (soumettre le prompt à amélioration par le LLM actif)
- Légende des variables dynamiques supportées affichée sous chaque prompt :

| Variable | Description |
|----------|-------------|
| `{source_content}` | Contenu source complet |
| `{network_name}` | Nom du réseau social |
| `{post_text}` | Texte du post généré |
| `{title}` | Titre de l'article |
| `{content}` | Corps de l'article |
| `{topics}` | Sujets fournis |
| `{tone}` | Ton sélectionné |
| `{length_desc}` | Description de la longueur |
| `{description}` | Description visuelle générée |

**Stockage des prompts :**
- **Primaire :** localStorage (accès instantané, aucune latence)
- **Secondaire :** Supabase table `site_config` → clé `'ai_prompts'` → valeur JSON
- Synchronisation au chargement de page (Supabase vers localStorage si plus récent)
- Fallback gracieux : si Supabase indisponible, localStorage seul suffit

---

### 3.6 Page Configuration API (`/admin/ai-config`)

**Deux sections :**

**Section 1 — Sélection des providers par catégorie :**
| Catégorie | Provider par défaut | Alternatives |
|-----------|-------------------|-------------|
| Rédaction texte | Gemini | OpenAI, DeepSeek, Perplexity |
| Images | Leonardo AI | OpenAI, Gemini, Freepik, Fal |
| Recherche web | Perplexity | Gemini, OpenAI |
| Posts sociaux | Gemini | OpenAI, DeepSeek |

**Section 2 — Statut des clés API :**
- Badge vert "Configurée" / rouge "Manquante" par provider
- **Jamais d'affichage de la valeur de la clé côté client**
- Les clés vivent uniquement dans `.env.local` côté serveur (`server-keys.ts`)
- Route `GET /api/ai/providers` retourne uniquement `Record<Provider, boolean>`
- Bouton "Tester la connexion" par provider (appel minimal de validation)

**Mapping clés (dans `server-keys.ts`, côté serveur uniquement) :**
```typescript
const KEY_MAP: Record<AIProvider, string> = {
  gemini:      'GEMINI_API_KEY',
  openai:      'OPENAI_API_KEY',
  perplexity:  'PERPLEXITY_API_KEY',
  deepseek:    'DEEPSEEK_API_KEY',
  fal:         'FAL_API_KEY',
  leonardo:    'LEONARDO_API_KEY',
  freepik:     'FREEPIK_API_KEY',
}
```

---

## 4. FLUX MÉTIER DÉTAILLÉ

### 4.1 Extraction de source
```
Client → POST /api/ai/scrape  { url }
       → GET page HTML → cheerio/readability → texte propre
       → { content: string, title?: string }

Client → POST /api/ai/pdf  { file: Buffer }
       → pdf-parse → texte intégral
       → { content: string, pageCount: number }
```

### 4.2 Génération posts sociaux
```
Client → POST /api/ai/chat {
  sourceContent: string,
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'telegram',
  provider?: AIProvider
}
→ API Route charge PROMPT_SYSTEM_GLOBAL + prompt plateforme depuis Supabase/localStorage
→ Appel LLM (temperature=0.7)
→ Retour { text: string, platform: string }
```

### 4.3 Génération image post social
```
Client → POST /api/ai/image {
  networkPost: string,
  sourceContent: string,
  platform: string,
  modelId: string,
  provider: AIProvider
}
→ API Route : generateImageDescription(networkPost, sourceContent)
  → LLM → description ≤ 50 mots
→ description + PROMPT_STYLE_{PLATFORM} → prompt final
→ Appel API image (provider choisi)
→ { imageUrl: string, modelUsed: string }
```

### 4.4 Génération article blog
```
Client → POST /api/ai/chat {
  topics: string,
  tone: string,
  lengthTarget: 'short' | 'medium' | 'long',
  type: 'article_draft'
}
→ PROMPT_SYSTEM_GLOBAL + article_drafting + variables injectées
→ LLM (temperature=0.7) → Markdown complet
→ POST /api/ai/chat { type: 'article_enrich', content }
→ article_enrichment → Markdown enrichi
→ { content: string, title: string }
```

---

## 5. GESTION DE L'HISTORIQUE (optionnel mais recommandé)

**Table Supabase `generations_history` :**
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
type          text  -- 'article' | 'social_post' | 'image'
platform      text  -- null si article
source_type   text  -- 'text' | 'url' | 'pdf'
source_excerpt text
output_text   text
image_url     text
provider_used text
created_at    timestamptz DEFAULT now()
```

**Stratégie de rotation localStorage (reproduire du projet de référence) :**
- Conserver les 10 derniers textes sociaux maximum
- Conserver les 4 dernières images maximum (quota poids)
- Nettoyage automatique au dépassement de quota

---

## 6. SÉCURITÉ

- **Clés API :** côté serveur uniquement, jamais dans le bundle client ni les réponses API
- **CSRF :** Next.js App Router + Server Actions protègent nativement
- **Rate limiting :** middleware simple par IP sur `/api/ai/*` (ex: 20 req/min)
- **Validation entrées :** Zod sur toutes les routes API (type, longueur max, format URL)
- **Upload PDF :** vérification MIME type côté serveur, limite taille 10 Mo
- **Scraping URL :** bloquer les IP privées (SSRF) — vérifier que l'URL cible est publique

---

## 7. DÉPLOIEMENT — DEUX MODES ET RECOMMANDATION

### 7.1 Mode A — Windows Autonome

**Option recommandée : `next build --output standalone` + script `.bat`**

```
next.config.ts :
  output: 'standalone'

Livraison :
  .standalone/
    server.js          ← point d'entrée Node.js
    start.bat          ← double-clic pour lancer
    .env.local         ← clés API (éditable par l'utilisateur)

start.bat :
  @echo off
  node server.js
  start http://localhost:3000
```

**Stockage :** SQLite via `better-sqlite3` dans `%APPDATA%\[NomApp]\data.db`  
**Mise à jour :** remplacement du dossier `.standalone/` (zip à dézipper)

**Alternative : Electron + Next.js (nextron)**  
Plus robuste (icône dock, fenêtre native, auto-update), mais complexité de packaging nettement supérieure.

---

### 7.2 Mode B — Web

**Option recommandée : Vercel (pas Hostinger)**

---

### 7.3 Analyse comparative des options de déploiement web

#### Option B1 — **Vercel** ✅ RECOMMANDÉE

| | Détail |
|-|--------|
| **Avantages** | Déploiement Next.js natif (même éditeur), Server Actions supportés, Edge Middleware, variables d'env gérées via UI, SSL auto, CDN mondial, preview deployments sur chaque PR, logs en temps réel |
| **Inconvénients** | Pas sur Hostinger (hébergeur différent), plan gratuit limité à 100 GB de bande passante, plan Pro à ~20 $/mois si trafic significatif |
| **Compatibilité** | Parfaite avec tout le stack (Supabase, API Routes, Server Actions) |
| **Effort DevOps** | Minimal — `git push` suffit |

#### Option B2 — Hostinger Node.js (plan Business/Cloud)

| | Détail |
|-|--------|
| **Avantages** | Mutualise avec l'hébergement WordPress existant, coût unique, panel familier |
| **Inconvénients** | Support Node.js partiel selon le plan (vérifier que le plan actuel inclut hPanel Node.js Manager), pas d'App Router natif, redémarrages automatiques non garantis, logs limités, pas de preview deployments, configuration PM2 manuelle requise |
| **Compatibilité** | Correcte si le plan inclut Node.js 18+. Déployer en mode `standalone` : `node .next/standalone/server.js` |
| **Effort DevOps** | Moyen — SSH + upload manuel ou CI/CD GitHub Actions vers Hostinger |

#### Option B3 — Hostinger mutualisé strict (PHP only)

| | Détail |
|-|--------|
| **Avantages** | Aucun coût supplémentaire |
| **Inconvénients** | **Non viable pour cette application.** Les API Routes Next.js requièrent Node.js. Un proxy PHP pour cacher les clés API est fragile et coûteux à maintenir. Le mode `output: 'export'` (statique) est incompatible avec les Server Actions, l'extraction PDF et le scraping |
| **Verdict** | ❌ À éviter sauf à déporter tout le backend ailleurs (Supabase Edge Functions) |

---

### 7.4 Recommandation finale de déploiement

```
Mode A (Windows) : next build standalone + start.bat
  → Simple, sans Docker, sans serveur, clés API dans .env.local local
  → L'utilisateur double-clique, l'app s'ouvre dans le navigateur

Mode B (Web)     : Vercel (frontend + API routes) + Supabase (BDD)
  → Stack 100% pensée pour ce cas d'usage
  → Si obligation Hostinger : plan Business avec Node.js Manager activé
```

**Pourquoi Vercel plutôt que Hostinger pour le mode web :**
- Next.js est développé et déployé en production par Vercel — zéro friction de configuration
- Les API Routes (scraping, PDF, appels LLM) nécessitent un runtime Node.js persistant que Hostinger mutualisé ne garantit pas
- Les variables d'environnement (clés API) sont gérées de façon sécurisée dans le dashboard Vercel, sans jamais apparaître dans le code ou un fichier versionné
- Le coût Vercel Pro (~20 $/mois) est inférieur à celui d'un VPS dédié pour héberger Node.js correctement, et sans maintenance serveur

---

## 8. VARIABLES D'ENVIRONNEMENT REQUISES

```bash
# LLM Texte
GEMINI_API_KEY=
OPENAI_API_KEY=
PERPLEXITY_API_KEY=
DEEPSEEK_API_KEY=

# Image
LEONARDO_API_KEY=
FREEPIK_API_KEY=
FAL_API_KEY=

# Base de données
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email (optionnel)
RESEND_API_KEY=
```

---

## 9. PHASES DE DÉVELOPPEMENT SUGGÉRÉES

| Phase | Contenu | Priorité |
|-------|---------|----------|
| **P0** | Scaffold Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui + layout admin + Supabase | Bloquante |
| **P1** | `AIProviderManager` (Gemini + OpenAI) + routes `/api/ai/chat` et `/api/ai/image` + mocks | Bloquante |
| **P2** | Page prompts + `server-keys.ts` + route providers status | Haute |
| **P3** | Dashboard — onglets Texte/URL/PDF + génération posts 5 réseaux + cards éditables | Haute |
| **P4** | Génération images (DALL-E 3 + Leonardo) + pipeline 2 étapes | Haute |
| **P5** | Génération articles blog + enrichissement | Moyenne |
| **P6** | Page ai-config (sélection provider par catégorie) | Moyenne |
| **P7** | Historique générations + gestion quota localStorage | Basse |
| **P8** | Packaging Windows (`start.bat`) + documentation utilisateur | Selon mode |

---

## 10. POINTS D'ATTENTION ISSUS DU PROJET DE RÉFÉRENCE

1. **Quota localStorage** : les images encodées en base64 saturent rapidement — stocker uniquement les URLs, jamais le contenu binaire
2. **Leonardo AI** : API asynchrone (polling requis) — implémenter un timeout et un retry limité
3. **Gemini Imagen** : retourne base64, pas une URL — convertir ou stocker en Supabase Storage avant d'envoyer au client
4. **Two-stage prompting** : ne pas sauter l'étape `generateImageDescription()` — la qualité des images est nettement supérieure avec cette description intermédiaire
5. **Prompts centralisés** : définir toutes les valeurs par défaut dans un seul fichier `prompts-default.ts` pour faciliter les reset et les migrations
6. **Facebook** : réseau absent du projet de référence — à implémenter en copiant exactement le pattern Telegram (même structure, différents contraintes de ton/longueur)
7. **Clés API Windows** : prévoir une route `POST /api/settings/save-env` qui écrit dans `.env.local` côté serveur avec redémarrage gracieux (ou instruction manuelle)
