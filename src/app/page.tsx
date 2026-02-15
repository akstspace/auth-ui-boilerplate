"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Shield, Key, Clock, Tag, Copy, Check, Lock, Fingerprint, Database, Globe, Terminal, FolderTree, Blocks, Sparkles } from "lucide-react"
import { AuthStatus } from "@/components/auth-status"
import { APITest } from "@/components/api-test"
import { ThemeToggle } from "@/components/theme-toggle"
import { FadeIn } from "@/components/fade-in"

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------
type Tab = "golang" | "python" | "express"

const tabs: { id: Tab; label: string }[] = [
  { id: "golang", label: "Go" },
  { id: "python", label: "Python" },
  { id: "express", label: "Express.js" },
]

const golangCode = `package auth

import (
    "errors"
    "fmt"
    "net/http"

    "github.com/lestrrat-go/jwx/v3/jwk"
    "github.com/lestrrat-go/jwx/v3/jwt"
)

type User struct {
    ID    string
    Email string
    Name  string
}

var (
    ErrMissingUserID = errors.New("missing user id")
)

func UserFromRequest(r *http.Request) (User, error) {
    keyset, err := jwk.Fetch(r.Context(), "http://localhost:3000/api/auth/jwks")
    if err != nil {
        return User{}, fmt.Errorf("fetch jwks: %w", err)
    }

    token, err := jwt.ParseRequest(r, jwt.WithKeySet(keyset))
    if err != nil {
        return User{}, fmt.Errorf("parse request: %w", err)
    }

    userID, exists := token.Subject()
    if !exists {
        return User{}, ErrMissingUserID
    }

    var email string
    var name string

    token.Get("email", &email)
    token.Get("name", &name)

    return User{
        ID:    userID,
        Email: email,
        Name:  name,
    }, nil
}`

const golangDeps = `go get github.com/lestrrat-go/jwx/v3`

const pythonCode = `import jwt
from jwt import PyJWKClient
from functools import wraps
from flask import Flask, request, jsonify

app = Flask(__name__)
JWKS_URL = "http://localhost:3000/api/auth/jwks"
ISSUER = AUDIENCE = "http://localhost:3000"
jwks_client = PyJWKClient(JWKS_URL)

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        try:
            key = jwks_client.get_signing_key_from_jwt(
                auth.removeprefix("Bearer "))
            payload = jwt.decode(auth.removeprefix("Bearer "),
                key.key, algorithms=["EdDSA", "RS256"],
                issuer=ISSUER, audience=AUDIENCE)
        except jwt.InvalidTokenError as e:
            return jsonify({"error": str(e)}), 401
        request.user = payload
        return f(*args, **kwargs)
    return decorated

@app.route("/api/me")
@require_auth
def me():
    return jsonify({
        "sub": request.user["sub"],
        "email": request.user["email"]
    })

if __name__ == "__main__":
    app.run(port=8080)`

const pythonDeps = `pip install flask PyJWT cryptography`

const expressCode = `import express from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
);

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWKS, {
      issuer: "http://localhost:3000",
      audience: "http://localhost:3000",
    });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ sub: req.user.sub, email: req.user.email });
});

app.listen(8080, () => console.log("Listening on :8080"));`

const expressDeps = `npm install express jose`

const codeMap: Record<Tab, { code: string; deps: string; lang: string }> = {
  golang: { code: golangCode, deps: golangDeps, lang: "go" },
  python: { code: pythonCode, deps: pythonDeps, lang: "python" },
  express: { code: expressCode, deps: expressDeps, lang: "typescript" },
}

const customizePrompt = `I cloned the auth-ui-boilerplate. Strip all demo/boilerplate UI and turn this into a clean starting point for my app. Specifically:

1. Remove demo components:
   - Delete src/components/auth-status.tsx (auth status card)
   - Delete src/components/api-test.tsx and src/components/api-test-axios.tsx (API test cards)

2. Replace the homepage (src/app/page.tsx):
   - Remove all demo content (How It Works, Backend Integration guide, Security Best Practices, Environment Variables, Project Structure, Credits sections)
   - Keep the nav bar with the app name and theme toggle (remove the Lock icon and GitHub link)
   - Remove all links from the footer (and remove the footer container as well)
   - Wrap the page with the LoginRequired component from src/components/login-required.tsx so unauthenticated users are redirected to /login
   - Add a simple welcome/dashboard layout that shows the authenticated user's name and a sign-out button (use authClient.useSession() from @/lib/auth-client)
   - Make Sign Out button part of Navbar instead of the page content.

3. Remove the Back button from Login & Signup pages:
   - Remove the "Back" link and ArrowLeft icon from src/app/login/page.tsx
   - Remove the "Back" link and ArrowLeft icon from src/app/signup/page.tsx

4. Keep these files as-is (core infrastructure):
   - src/lib/auth.ts and src/lib/auth-client.ts (Better Auth config)
   - src/lib/api-client.ts and src/lib/api-client-axios.ts (API clients with JWT injection)
   - src/app/api/auth/[...all]/route.ts (auth API handler)
   - src/app/api/[...path]/route.ts (JWT-injecting API proxy)
   - src/app/login/page.tsx and src/app/signup/page.tsx (auth pages — except the Back button removal above)
   - src/db/ (Drizzle schema and migrations)
   - src/components/ui/ (shadcn/ui primitives)
   - src/components/theme-provider.tsx and src/components/theme-toggle.tsx
   - src/components/fade-in.tsx
   - src/components/login-required.tsx

5. Update the app name:
   - Ask me what my app name is before making any changes
   - Then replace "Auth UI Boilerplate" with my app name in the nav, footer, and src/app/layout.tsx metadata

6. Clean up unused imports after removing components.

The result should compile with npm run build and show a minimal authenticated dashboard.`

// ---------------------------------------------------------------------------
// Simple syntax highlighter — keywords, strings, comments, types
// ---------------------------------------------------------------------------
const SYNTAX_RULES: Record<string, { keywords: RegExp; types: RegExp; strings: RegExp; comments: RegExp; funcs: RegExp }> = {
  go: {
    keywords: /\b(package|import|func|var|return|if|err|nil|type|struct|string|const)\b/g,
    types: /\b(User|http\.Request|error)\b/g,
    strings: /(["'`])(?:(?=(\\?))\2.)*?\1/g,
    comments: /(\/\/.*$)/gm,
    funcs: /\b(UserFromRequest|Fetch|ParseRequest|Subject|Get|Errorf)\b/g,
  },
  python: {
    keywords: /\b(import|from|def|return|if|not|try|except|as|class|True|False|None)\b/g,
    types: /\b(Flask|PyJWKClient|str)\b/g,
    strings: /("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"]*"|'[^']*')/g,
    comments: /(#.*$)/gm,
    funcs: /\b(wraps|jsonify|startswith|removeprefix|get_signing_key_from_jwt|decode|route|run)\b/g,
  },
  typescript: {
    keywords: /\b(import|from|const|async|function|return|if|try|catch|new)\b/g,
    types: /\b(URL|Response|Request)\b/g,
    strings: /(["'`])(?:(?=(\\?))\2.)*?\1/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    funcs: /\b(createRemoteJWKSet|jwtVerify|requireAuth|startsWith|json|get|listen|status|log)\b/g,
  },
}

function highlightCode(code: string, lang: string): React.ReactNode[] {
  const rules = SYNTAX_RULES[lang]
  if (!rules) return [code]

  // Tokenize with positions
  type Token = { start: number; end: number; className: string; text: string }
  const tokens: Token[] = []

  const addTokens = (regex: RegExp, className: string) => {
    let match
    const re = new RegExp(regex.source, regex.flags)
    while ((match = re.exec(code)) !== null) {
      tokens.push({ start: match.index, end: match.index + match[0].length, className, text: match[0] })
    }
  }

  addTokens(rules.comments, "text-zinc-500 dark:text-zinc-500 italic")
  addTokens(rules.strings, "text-emerald-600 dark:text-emerald-400")
  addTokens(rules.keywords, "text-violet-600 dark:text-violet-400 font-medium")
  addTokens(rules.types, "text-amber-600 dark:text-amber-400")
  addTokens(rules.funcs, "text-blue-600 dark:text-blue-400")

  // Sort by start position, longer matches first
  tokens.sort((a, b) => a.start - b.start || b.end - a.end)

  // Remove overlapping tokens (keep first/longest)
  const filtered: Token[] = []
  let lastEnd = 0
  for (const t of tokens) {
    if (t.start >= lastEnd) {
      filtered.push(t)
      lastEnd = t.end
    }
  }

  // Build output
  const result: React.ReactNode[] = []
  let pos = 0
  for (const t of filtered) {
    if (t.start > pos) {
      result.push(code.slice(pos, t.start))
    }
    result.push(<span key={t.start} className={t.className}>{t.text}</span>)
    pos = t.end
  }
  if (pos < code.length) {
    result.push(code.slice(pos))
  }
  return result
}

// ---------------------------------------------------------------------------
// Reusable components
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
      className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

function CodeBlock({ code, copyable = false }: { code: string; copyable?: boolean }) {
  return (
    <div className="relative rounded-lg border border-border/50 bg-muted/30 overflow-hidden group">
      {copyable && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={code} />
        </div>
      )}
      <pre className="p-4 text-sm font-mono text-foreground/90 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("golang")
  const current = codeMap[activeTab]

  return (
    <div className="min-h-dvh bg-background text-foreground transition-colors duration-200">

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-2.5">
            <Lock className="size-5 text-foreground" />
            <span className="font-semibold text-foreground text-sm tracking-tight">Auth UI Boilerplate</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/akstspace/auth-ui-boilerplate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
            >
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* ── Title + Description ─────────────────────────────────── */}
        <section className="pt-12 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground">
              Auth UI Boilerplate
            </h1>
            <p className="mt-2 text-muted-foreground text-pretty max-w-2xl">
              Next.js + <strong className="text-foreground font-medium">Better Auth</strong> + <strong className="text-foreground font-medium">Drizzle ORM</strong> + <strong className="text-foreground font-medium">JWT/JWKS</strong> backend integration. Includes Google OAuth, email/password auth, API proxy with automatic JWT injection, and integration guides for Go, Python, and Express.
            </p>
          </motion.div>
        </section>

        {/* ── Auth + API Test ─────────────────────────────────────── */}
        <section className="mb-16">
          <div className="grid gap-6 md:grid-cols-2">
            <AuthStatus />
            <APITest />
          </div>
        </section>

        {/* ── Quick Start ─────────────────────────────────────────── */}
        <section className="mb-16">
          <FadeIn>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex items-center justify-center size-8 rounded-lg bg-muted">
                <Terminal className="size-4 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground text-balance">Quick Start (Dev Container)</h2>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-5">
              <p className="text-sm text-muted-foreground text-pretty">
                Requires <a href="https://code.visualstudio.com/" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:no-underline">VS Code</a> + <a href="https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:no-underline">Dev Containers extension</a> + Docker.
              </p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center size-6 rounded-full bg-muted text-xs font-bold tabular-nums text-foreground">1</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Open in Dev Container</p>
                    <p className="text-xs text-muted-foreground mt-0.5 text-pretty">Open this repo in VS Code, then <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs border border-border/50">Cmd+Shift+P</kbd> → &ldquo;Dev Containers: Reopen in Container&rdquo;.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center size-6 rounded-full bg-muted text-xs font-bold tabular-nums text-foreground">2</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Install prerequisites</p>
                    <p className="text-xs text-muted-foreground mt-0.5 text-pretty mb-2">Inside the container, set up Node.js and Python.</p>
                    <CodeBlock code={`volta install node\npyenv install 3.12\npyenv global 3.12`} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center size-6 rounded-full bg-muted text-xs font-bold tabular-nums text-foreground">3</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Configure environment</p>
                    <p className="text-xs text-muted-foreground mt-0.5 text-pretty mb-2">Copy and edit the example env file. Update Google OAuth credentials.</p>
                    <CodeBlock code="cp .env.example .env" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center size-6 rounded-full bg-muted text-xs font-bold tabular-nums text-foreground">4</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Install & run</p>
                    <CodeBlock code={`npm install\nnpm run db:push    # Push schema to Postgres\nnpm run dev        # Start dev server on :3000`} />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Manual Setup (No Dev Container)</p>
                <p className="text-xs text-muted-foreground text-pretty">
                  Have Node.js 22+ and PostgreSQL running locally. Then: <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">cp .env.example .env</code> → update <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">DATABASE_URL</code> → <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">npm install && npm run db:push && npm run dev</code>
                </p>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ── How It Works ────────────────────────────────────────── */}
        <section className="mb-16">
          <FadeIn>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex items-center justify-center size-8 rounded-lg bg-muted">
                <Fingerprint className="size-4 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground text-balance">How It Works</h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: 1, icon: Fingerprint, title: "User signs in", desc: "Email/password or OAuth via Better Auth" },
              { n: 2, icon: Key, title: "JWT issued", desc: "Short-lived token from /api/auth/token" },
              { n: 3, icon: Globe, title: "Sent to backend", desc: "Authorization: Bearer header on API calls" },
              { n: 4, icon: Shield, title: "Backend verifies", desc: "Validated via JWKS public key endpoint" },
            ].map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.1}>
                <div className="group relative h-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 hover:-translate-y-0.5 transition-transform duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                      <step.icon className="size-4 text-foreground" />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">0{step.n}</span>
                  </div>
                  <h3 className="font-medium text-foreground text-sm mb-1">{step.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed text-pretty">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── Backend Integration ──────────────────────────────────── */}
        <section id="integration" className="mb-16 scroll-mt-20">
          <FadeIn>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-muted">
                <Blocks className="size-4 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground text-balance">Backend Integration</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6 ml-[42px] text-pretty">
              This boilerplate issues JWTs verified via JWKS — no shared secrets needed. Your backend fetches public keys from <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{"BETTER_AUTH_URL"}/api/auth/jwks</code>.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center gap-1 border-b border-border/50 px-4 pt-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${activeTab === tab.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                  </button>
                ))}
                <div className="ml-auto pb-2">
                  <CopyButton text={current.code} />
                </div>
              </div>

              {/* Dependencies */}
              <div className="border-b border-border/30 bg-muted/20 px-5 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Database className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dependencies</span>
                </div>
                <pre className="text-sm text-foreground font-mono"><code>{current.deps}</code></pre>
              </div>

              {/* Code with syntax highlighting */}
              <div className="max-h-[480px] overflow-y-auto">
                <pre className="p-5 text-sm font-mono leading-relaxed">
                  <code>{highlightCode(current.code, current.lang)}</code>
                </pre>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ── Database (Drizzle ORM) ──────────────────────────────── */}
        <section className="mb-16">
          <FadeIn>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex items-center justify-center size-8 rounded-lg bg-muted">
                <Database className="size-4 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground text-balance">Database (Drizzle ORM)</h2>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-5">
              <p className="text-sm text-muted-foreground text-pretty">
                Uses <a href="https://orm.drizzle.team/" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:no-underline">Drizzle ORM</a> with PostgreSQL. Schema is in <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">src/db/schema.ts</code> and includes tables auto-generated by Better Auth: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">user</code>, <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">session</code>, <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">account</code>, <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">verification</code>, <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">jwks</code>.
              </p>

              <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-5 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Command</th>
                      <th className="px-5 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {[
                      { cmd: "npm run db:push", desc: "Push schema directly to DB (dev — no migration files)" },
                      { cmd: "npm run db:generate", desc: "Generate SQL migration files from schema changes" },
                      { cmd: "npm run db:migrate", desc: "Run pending migrations against the database" },
                      { cmd: "npm run db:studio", desc: "Open Drizzle Studio (visual DB browser)" },
                    ].map((row) => (
                      <tr key={row.cmd} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-2.5">
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{row.cmd}</code>
                        </td>
                        <td className="px-5 py-2.5 text-muted-foreground text-pretty text-xs">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Adding tables</p>
                <p className="text-xs text-muted-foreground text-pretty mb-2">
                  Define your table in <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">src/db/schema.ts</code>, then run <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">npm run db:push</code> to push or <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">npm run db:generate && npm run db:migrate</code> for migration files.
                </p>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ── Environment Variables ────────────────────────────────── */}
        <section className="mb-16">
          <FadeIn>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex items-center justify-center size-8 rounded-lg bg-muted">
                <Key className="size-4 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground text-balance">Environment Variables</h2>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Variable</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Scope</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {[
                    { name: "DATABASE_URL", scope: "Server", desc: "PostgreSQL connection string" },
                    { name: "BETTER_AUTH_SECRET", scope: "Server", desc: "Secret for signing tokens and cookies" },
                    { name: "BETTER_AUTH_URL", scope: "Server", desc: "Auth server URL" },
                    { name: "NEXT_PUBLIC_BETTER_AUTH_URL", scope: "Client", desc: "Auth client URL" },
                    { name: "GOOGLE_CLIENT_ID", scope: "Server", desc: "Google OAuth client ID" },
                    { name: "GOOGLE_CLIENT_SECRET", scope: "Server", desc: "Google OAuth client secret" },
                    { name: "BACKEND_API_URL", scope: "Server", desc: "Backend URL for API proxy (optional)" },
                    { name: "NEXT_PUBLIC_BACKEND_API_URL", scope: "Client", desc: "Backend URL for browser clients (optional)" },
                  ].map((v) => (
                    <tr key={v.name} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-2.5">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground tabular-nums">{v.name}</code>
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">{v.scope}</td>
                      <td className="px-5 py-2.5 text-muted-foreground text-pretty text-xs">{v.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </section>

        {/* ── Security Best Practices ─────────────────────────────── */}
        <section className="mb-16">
          <FadeIn>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex items-center justify-center size-8 rounded-lg bg-muted">
                <Shield className="size-4 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground text-balance">Security Best Practices</h2>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Lock, title: "Use HTTPS in production", desc: "JWTs are bearer tokens — anyone who intercepts one can impersonate the user. Always use TLS." },
              { icon: Key, title: "Verify via JWKS", desc: "Always validate the JWT signature using JWKS public keys. Never just decode and trust the payload." },
              { icon: Clock, title: "Respect token expiration", desc: "better-auth JWTs are short-lived by default. Always check the exp claim and reject expired tokens." },
              { icon: Tag, title: "Validate issuer & audience", desc: "Ensure iss and aud claims match your Better Auth URL to prevent cross-service token misuse." },
            ].map((note, i) => (
              <FadeIn key={note.title} delay={i * 0.08}>
                <div className="group flex gap-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 hover:-translate-y-0.5 transition-transform duration-200">
                  <div className="flex-shrink-0 flex items-center justify-center size-10 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
                    <note.icon className="size-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground text-sm mb-1">{note.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed text-pretty">{note.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── Project Structure ────────────────────────────────────── */}
        <section className="mb-16">
          <FadeIn>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex items-center justify-center size-8 rounded-lg bg-muted">
                <FolderTree className="size-4 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground text-balance">Project Structure</h2>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <CodeBlock code={`src/
├── app/
│   ├── api/auth/[...all]/   # Better Auth handler
│   ├── api/[...path]/       # JWT-injecting API proxy
│   ├── login/ & signup/     # Auth pages
│   └── page.tsx             # Home
├── components/              # Auth status, API test, shadcn/ui
├── lib/                     # Auth config, API clients (fetch & axios)
└── db/                      # Drizzle schema & migrations`} />
          </FadeIn>
        </section>

        {/* ── Customize with AI ──────────────────────────────────── */}
        <section className="mb-16">
          <FadeIn>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-muted">
                <Sparkles className="size-4 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground text-balance">Customize with AI</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6 ml-[42px] text-pretty">
              Give this prompt to your AI coding assistant (Cursor, Copilot, Claude Code, etc.) to strip the demo UI and set up your app.
            </p>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent Prompt</span>
                <CopyButton text={customizePrompt} />
              </div>
              <pre className="p-5 text-sm font-mono text-foreground/80 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {customizePrompt}
              </pre>
            </div>
          </FadeIn>
        </section>

        {/* ── Credits ─────────────────────────────────────────────── */}
        <section className="mb-16">
          <FadeIn>
            <div className="flex items-center gap-2.5 mb-4">
              <h2 className="text-lg font-bold text-foreground text-balance">Credits</h2>
            </div>
            <p className="text-sm text-muted-foreground text-pretty">
              Initial codebase from{" "}
              <a href="https://github.com/dreamsofcode-io/authly" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:no-underline">
                dreamsofcode-io/authly
              </a>
              , from which this project was updated and extended.
            </p>
          </FadeIn>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">

          <div className="flex items-center gap-6">
            <a href="https://better-auth.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Better Auth
            </a>
            <a href="https://orm.drizzle.team" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Drizzle ORM
            </a>
            <a href="https://better-auth.com/docs/plugins/jwt" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              JWT Docs
            </a>
            <a href="https://github.com/akstspace/auth-ui-boilerplate" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
