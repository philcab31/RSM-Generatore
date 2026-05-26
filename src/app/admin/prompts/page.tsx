"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_PROMPTS } from "@/lib/ai/prompts-default";
import { useAIConfig } from "@/context/AIConfigContext";
import { useBrandIdentity } from "@/context/BrandIdentityContext";
import { buildBrandTextBlock, buildBrandVisualBlock, buildReferenceImagePrompt } from "@/lib/brand-identity";
import {
  Save,
  RotateCcw,
  Sparkles,
  Loader2,
  MessageSquare,
  Variable,
  GitBranch,
  Eye,
  Copy,
} from "lucide-react";

const PROMPT_IDS = Object.keys(DEFAULT_PROMPTS);

const PROMPT_LABELS: Record<string, string> = {
  PROMPT_SYSTEM_GLOBAL: "Contexte métier global",
  article_drafting: "Rédaction article (draft)",
  article_enrichment: "Enrichissement article",
  image_description_generator: "Description visuelle (image)",
  article_image_style: "Style image article",
  social_twitter: "Post Twitter/X",
  social_linkedin: "Post LinkedIn",
  social_instagram: "Post Instagram",
  social_facebook: "Post Facebook",
  social_telegram: "Post Telegram",
  social_twitter_style: "Style image Twitter",
  social_linkedin_style: "Style image LinkedIn",
  social_instagram_style: "Style image Instagram",
  social_facebook_style: "Style image Facebook",
  social_telegram_style: "Style image Telegram",
  research_veille: "Veille / recherche web",
  carousel_instagram: "Carrousel Instagram",
  carousel_linkedin: "Carrousel LinkedIn",
  carousel_facebook: "Carrousel Facebook",
  carousel_twitter: "Carrousel X (Twitter)",
  carousel_tiktok: "Carrousel TikTok",
  carousel_instagram_style: "Style image carrousel Instagram",
  carousel_linkedin_style: "Style image carrousel LinkedIn",
  carousel_facebook_style: "Style image carrousel Facebook",
  carousel_twitter_style: "Style image carrousel X",
  carousel_tiktok_style: "Style image carrousel TikTok",
};

const VARIABLES = [
  { name: "{source_content}", desc: "Contenu source complet" },
  { name: "{network_name}", desc: "Nom du réseau social" },
  { name: "{post_text}", desc: "Texte du post généré" },
  { name: "{title}", desc: "Titre de l'article" },
  { name: "{content}", desc: "Corps de l'article" },
  { name: "{topics}", desc: "Sujets fournis" },
  { name: "{tone}", desc: "Ton sélectionné" },
  { name: "{length_desc}", desc: "Description de la longueur" },
  { name: "{description}", desc: "Description visuelle générée" },
];

const STORAGE_KEY = "ai_prompts_custom";

// ─────────────────────────────────────────────
// PIPELINE SCENARIOS
// ─────────────────────────────────────────────

const PLATFORMS = [
  { id: "twitter", label: "Twitter / X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "telegram", label: "Telegram" },
  { id: "tiktok", label: "TikTok" },
];

const SCENARIOS = [
  { id: "social_post", label: "Post social" },
  { id: "image", label: "Image sociale" },
  { id: "article", label: "Article" },
  { id: "carousel", label: "Carrousel" },
] as const;

type ScenarioId = (typeof SCENARIOS)[number]["id"];
type PlatformId = (typeof PLATFORMS)[number]["id"];

interface PipelineStep {
  step: number;
  name: string;
  description: string;
  promptId?: string;
  systemBlock?: string;
  assembledPrompt: string;
  outputLabel?: string;
  outputPreview?: string;
  editable: boolean;
  referenceImages?: string[];
  apiCall?: string;
}

function getExampleVariables(scenario: ScenarioId, platform: PlatformId): Record<string, string> {
  const examples: Record<string, string> = {
    source_content: "L'intelligence artificielle transforme le quotidien des infirmiers libéraux en automatisant les tâches administratives.",
    title: "L'IA au service des soins à domicile",
    content: "Les nouveaux outils d'IA permettent aux infirmiers de gagner du temps sur la paperasse et de se concentrer sur les patients.",
    topics: "Intelligence artificielle en santé, infirmiers libéraux, télémédecine",
    tone: "Expert & Rassurant",
    length_desc: "Moyen (800-1200 mots)",
    network_name: platform,
    post_text: "Découvrez comment l'IA révolutionne les soins à domicile !",
    description: "A professional healthcare illustration showing a nurse using a tablet with AI interface, modern medical office, soft lighting, warm colors.",
  };
  return examples;
}

function buildPipeline(
  scenario: ScenarioId,
  platform: PlatformId,
  prompts: Record<string, string>,
  brand: import("@/lib/brand-identity").BrandIdentity
): PipelineStep[] {
  const systemGlobal = prompts.PROMPT_SYSTEM_GLOBAL || DEFAULT_PROMPTS.PROMPT_SYSTEM_GLOBAL || "";
  const brandText = buildBrandTextBlock(brand);
  const systemPrompt = [brandText, systemGlobal].filter(Boolean).join("\n\n");
  const examples = getExampleVariables(scenario, platform);

  const replaceVars = (text: string) => {
    let result = text;
    for (const [key, value] of Object.entries(examples)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  };

  const steps: PipelineStep[] = [];

  // ── Step 0: System Prompt (always present) ──
  steps.push({
    step: 0,
    name: "System Prompt Global + Identité Marque",
    description: "Injecté automatiquement avant chaque appel LLM. Contient le contexte métier global et le bloc identité marque.",
    systemBlock: systemPrompt,
    assembledPrompt: systemPrompt,
    editable: false,
  });

  if (scenario === "social_post") {
    const promptId = `social_${platform}`;
    const rawPrompt = prompts[promptId] || DEFAULT_PROMPTS[promptId] || "";
    const userPrompt = replaceVars(rawPrompt);
    steps.push({
      step: 1,
      name: `Prompt utilisateur — Post ${platform}`,
      description: "Le prompt spécifique au réseau social, avec les contraintes de format et de ton.",
      promptId,
      assembledPrompt: userPrompt,
      outputLabel: "Post généré (exemple)",
      outputPreview: "Infirmiers, découvrez comment l'IA transforme votre quotidien ! #Santé #Innovation",
      editable: true,
    });
    steps.push({
      step: 2,
      name: "Prompt assemblé complet",
      description: "Ce qui est réellement envoyé au LLM : le system prompt suivi du user prompt.",
      assembledPrompt: `${systemPrompt}\n\n${userPrompt}`,
      editable: false,
    });
  }

  if (scenario === "image") {
    // Step 1: Description generation
    const descPromptId = "image_description_generator";
    const rawDescPrompt = prompts[descPromptId] || DEFAULT_PROMPTS[descPromptId] || "";
    const descPrompt = replaceVars(rawDescPrompt);
    steps.push({
      step: 1,
      name: "Étape 1 — Description visuelle (LLM)",
      description: "Le LLM analyse le contenu et génère une description visuelle en anglais.",
      promptId: descPromptId,
      assembledPrompt: `${systemPrompt}\n\n${descPrompt}`,
      outputLabel: "Description générée (exemple)",
      outputPreview: examples.description,
      editable: true,
    });

    // Step 2: Final prompt assembly
    const visualBlock = buildBrandVisualBlock(brand);
    const stylePromptId = `social_${platform}_style` as keyof typeof DEFAULT_PROMPTS;
    const style = prompts[stylePromptId] || DEFAULT_PROMPTS[stylePromptId] || "";
    const finalPrompt = [examples.description, visualBlock, style].filter(Boolean).join(". ").trim();
    steps.push({
      step: 2,
      name: "Étape 2 — Assemblage du prompt final",
      description: "Le prompt final est construit en combinant la description, les contraintes visuelles de la marque, et le style du réseau social.",
      assembledPrompt: finalPrompt,
      editable: false,
    });

    // Step 3: Image generation API
    const refCount = brand.referenceImages?.length || 0;
    const refPrompt = refCount > 0 ? buildReferenceImagePrompt(brand.referenceImages, finalPrompt) : undefined;
    steps.push({
      step: 3,
      name: "Étape 3 — Appel API image",
      description: refCount > 0
        ? `Appel à images.edit avec ${refCount} image(s) de référence jointes. Le prompt structuré nomme explicitement chaque image et son rôle.`
        : "Appel à images.generate sans image de référence.",
      assembledPrompt: refPrompt || finalPrompt,
      editable: false,
      referenceImages: brand.referenceImages,
      apiCall: refCount > 0 ? "images.edit (gpt-image-2)" : "images.generate (gpt-image-2)",
    });
  }

  if (scenario === "article") {
    const promptId = "article_drafting";
    const rawPrompt = prompts[promptId] || DEFAULT_PROMPTS[promptId] || "";
    const userPrompt = replaceVars(rawPrompt);
    steps.push({
      step: 1,
      name: "Prompt utilisateur — Rédaction d'article",
      description: "Le prompt de structuration et de rédaction de l'article avec les contraintes de ton et de longueur.",
      promptId,
      assembledPrompt: `${systemPrompt}\n\n${userPrompt}`,
      editable: true,
    });
  }

  if (scenario === "carousel") {
    const promptId = `carousel_${platform}`;
    const rawPrompt = prompts[promptId] || DEFAULT_PROMPTS[promptId] || "";
    const userPrompt = replaceVars(rawPrompt);
    steps.push({
      step: 1,
      name: `Prompt utilisateur — Carrousel ${platform}`,
      description: "Le prompt de génération du script JSON du carrousel.",
      promptId,
      assembledPrompt: `${systemPrompt}\n\n${userPrompt}`,
      editable: true,
    });

    // Step 2: Per-slide image generation pipeline
    const descPromptId = "image_description_generator";
    const rawDescPrompt = prompts[descPromptId] || DEFAULT_PROMPTS[descPromptId] || "";
    const descPrompt = replaceVars(rawDescPrompt);
    steps.push({
      step: 2,
      name: "Étape 2 — Description visuelle par slide (LLM)",
      description: "Pour chaque slide du carrousel, le LLM génère une description visuelle en anglais basée sur le texte du slide.",
      promptId: descPromptId,
      assembledPrompt: `${systemPrompt}\n\n${descPrompt}`,
      outputLabel: "Description générée (exemple)",
      outputPreview: examples.description,
      editable: true,
    });

    // Step 3: Final image prompt assembly per slide
    const visualBlock = buildBrandVisualBlock(brand);
    const stylePromptId = `carousel_${platform}_style` as keyof typeof DEFAULT_PROMPTS;
    const style = prompts[stylePromptId] || DEFAULT_PROMPTS[stylePromptId] || "";
    const finalPrompt = [examples.description, visualBlock, style].filter(Boolean).join(". ").trim();
    steps.push({
      step: 3,
      name: "Étape 3 — Assemblage du prompt image par slide",
      description: "Le prompt final pour chaque image de slide est construit en combinant la description, les contraintes visuelles de la marque, et le style du carrousel.",
      assembledPrompt: finalPrompt,
      editable: false,
    });

    // Step 4: Image generation API per slide
    const refCount = brand.referenceImages?.length || 0;
    const refPrompt = refCount > 0 ? buildReferenceImagePrompt(brand.referenceImages, finalPrompt) : undefined;
    steps.push({
      step: 4,
      name: "Étape 4 — Appel API image (par slide)",
      description: refCount > 0
        ? `Appel à images.edit avec ${refCount} image(s) de référence jointes pour chaque slide. Le prompt structuré nomme explicitement chaque image et son rôle.`
        : "Appel à images.generate sans image de référence pour chaque slide.",
      assembledPrompt: refPrompt || finalPrompt,
      editable: false,
      referenceImages: brand.referenceImages,
      apiCall: refCount > 0 ? "images.edit (gpt-image-2)" : "images.generate (gpt-image-2)",
    });
  }

  return steps;
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function PromptsPage() {
  const { config } = useAIConfig();
  const { brand } = useBrandIdentity();
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [loadingOptimize, setLoadingOptimize] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Pipeline state
  const [activeTab, setActiveTab] = useState("individual");
  const [scenario, setScenario] = useState<ScenarioId>("social_post");
  const [platform, setPlatform] = useState<PlatformId>("twitter");
  const [pipelineSaveStatus, setPipelineSaveStatus] = useState("");

  // Load from server + localStorage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/ai/prompts");
        if (res.ok) {
          const serverPrompts = await res.json();
          setPrompts(serverPrompts);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverPrompts));
          return;
        }
      } catch {
        // fallback to localStorage
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPrompts({ ...DEFAULT_PROMPTS, ...parsed });
          return;
        } catch {
          // ignore
        }
      }
      setPrompts({ ...DEFAULT_PROMPTS });
    };
    load();
  }, []);

  const persist = useCallback((newPrompts: Record<string, string>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrompts));
    fetch("/api/ai/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPrompts),
    }).catch(() => {});
  }, []);

  const updatePrompt = (id: string, value: string) => {
    setPrompts((prev) => {
      const next = { ...prev, [id]: value };
      if (debounceRef.current[id]) {
        clearTimeout(debounceRef.current[id]);
      }
      debounceRef.current[id] = setTimeout(() => {
        persist(next);
        setSaveStatus((s) => ({ ...s, [id]: "Sauvegarde auto OK" }));
        setTimeout(() => {
          setSaveStatus((s) => {
            const copy = { ...s };
            delete copy[id];
            return copy;
          });
        }, 2000);
      }, 1000);
      return next;
    });
  };

  const forceSave = (id?: string) => {
    setPrompts((prev) => {
      persist(prev);
      if (id) {
        setSaveStatus((s) => ({ ...s, [id]: "Sauvegardé 💾" }));
        setTimeout(() => {
          setSaveStatus((s) => {
            const copy = { ...s };
            delete copy[id];
            return copy;
          });
        }, 2000);
      } else {
        setPipelineSaveStatus("Tous les prompts sauvegardés 💾");
        setTimeout(() => setPipelineSaveStatus(""), 3000);
      }
      return prev;
    });
  };

  const resetPrompt = (id: string) => {
    const defaultValue = DEFAULT_PROMPTS[id];
    if (defaultValue) {
      setPrompts((prev) => {
        const next = { ...prev, [id]: defaultValue };
        persist(next);
        return next;
      });
    }
  };

  const optimizePrompt = async (id: string) => {
    const currentText = prompts[id];
    if (!currentText) return;

    setLoadingOptimize(id);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "social_post",
          sourceContent: `Améliore le prompt système suivant pour un LLM. Garde les variables {xxx} intactes. Rends-le plus précis, structuré et efficace.\n\nPrompt actuel :\n${currentText}`,
          platform: "twitter",
          provider: config.textProvider,
          model: config.textModel,
        }),
      });
      const data = await res.json();
      if (data.text) {
        const cleaned = data.text.replace(/^["']|["']$/g, "").trim();
        setPrompts((prev) => {
          const next = { ...prev, [id]: cleaned };
          persist(next);
          return next;
        });
        setSaveStatus((s) => ({ ...s, [id]: "Optimisé par IA" }));
      }
    } catch {
      setSaveStatus((s) => ({ ...s, [id]: "Erreur optimisation" }));
    } finally {
      setLoadingOptimize(null);
    }
  };

  const pipelineSteps = buildPipeline(scenario, platform, prompts, brand);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
        <p className="text-muted-foreground mt-2">
          Personnalisez les prompts système et visualisez les pipelines de génération.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="individual">
            <MessageSquare className="h-4 w-4 mr-2" />
            Prompts individuels
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            <GitBranch className="h-4 w-4 mr-2" />
            Pipeline / Simulateur
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Individual Prompts ── */}
        <TabsContent value="individual" className="space-y-6 mt-6">
          {/* Variables legend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Variable className="h-4 w-4" />
                Variables dynamiques disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map((v) => (
                  <Badge key={v.name} variant="outline" className="cursor-help" title={v.desc}>
                    {v.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Prompts list */}
          <div className="space-y-4">
            {PROMPT_IDS.map((id) => (
              <Card key={id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                      {PROMPT_LABELS[id] || id}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {saveStatus[id] && (
                        <span className="text-xs text-muted-foreground">{saveStatus[id]}</span>
                      )}
                      <Button size="sm" variant="outline" onClick={() => forceSave(id)} title="Enregistrer">
                        <Save className="h-4 w-4" />
                        <span className="sr-only">Enregistrer</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => optimizePrompt(id)} disabled={loadingOptimize === id}>
                        {loadingOptimize === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        <span className="sr-only">Optimiser</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resetPrompt(id)}>
                        <RotateCcw className="h-4 w-4" />
                        <span className="sr-only">Réinitialiser</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={prompts[id] || ""}
                    onChange={(e) => updatePrompt(id, e.target.value)}
                    placeholder={`Saisissez le prompt pour ${PROMPT_LABELS[id] || id}...`}
                    className="min-h-[120px] font-mono text-sm"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── TAB 2: Pipeline / Simulateur ── */}
        <TabsContent value="pipeline" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base">Simulateur de pipeline</CardTitle>
                <div className="flex items-center gap-2">
                  {pipelineSaveStatus && (
                    <span className="text-xs text-muted-foreground">{pipelineSaveStatus}</span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => forceSave()}>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer les modifications
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Controls */}
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Scénario</label>
                  <Select value={scenario} onValueChange={(v) => setScenario(v as ScenarioId)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCENARIOS.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Plateforme</label>
                  <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformId)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Brand Identity Block (read-only preview) */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Blocs identité marque (injectés automatiquement)</h3>
                  <Badge variant="outline" className="text-[10px]">Lecture seule</Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase">Texte (LLM)</span>
                    <pre className="mt-1 rounded bg-emerald-950/5 p-2 text-xs whitespace-pre-wrap break-words font-mono text-emerald-900">
                      {buildBrandTextBlock(brand) || "(Aucune identité marque configurée)"}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-blue-600 uppercase">Visuel (image)</span>
                    <pre className="mt-1 rounded bg-blue-950/5 p-2 text-xs whitespace-pre-wrap break-words font-mono text-blue-900">
                      {buildBrandVisualBlock(brand) || "(Aucun bloc visuel configuré)"}
                    </pre>
                  </div>
                </div>
                {brand.referenceImages && brand.referenceImages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {brand.referenceImages.length} image(s) de référence
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Le prompt structuré avec rôles Image 1/2/3 sera injecté automatiquement.
                    </span>
                  </div>
                )}
              </div>

              {/* Pipeline Steps */}
              <div className="space-y-3">
                {pipelineSteps.map((step) => (
                  <PipelineStepCard
                    key={step.step}
                    step={step}
                    prompts={prompts}
                    onUpdatePrompt={updatePrompt}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────
// PIPELINE STEP CARD
// ─────────────────────────────────────────────

function PipelineStepCard({
  step,
  prompts,
  onUpdatePrompt,
}: {
  step: PipelineStep;
  prompts: Record<string, string>;
  onUpdatePrompt: (id: string, value: string) => void;
}) {
  const [showPreview, setShowPreview] = useState(true);
  const promptValue = step.promptId ? prompts[step.promptId] || DEFAULT_PROMPTS[step.promptId] || "" : "";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/30">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="shrink-0 min-w-[2rem] justify-center">
            {step.step}
          </Badge>
          <div>
            <div className="font-medium text-sm">{step.name}</div>
            {step.description && (
              <div className="text-xs text-muted-foreground">{step.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step.promptId && (
            <span className="text-[10px] text-muted-foreground font-mono">{step.promptId}</span>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4 opacity-50" />}
          </Button>
        </div>
      </div>

      {showPreview && (
        <div className="p-3 space-y-3">
          {step.systemBlock && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">System Prompt (injecté)</span>
                <CopyButton text={step.systemBlock} />
              </div>
              <pre className="rounded bg-emerald-950/5 p-2.5 text-xs whitespace-pre-wrap break-words font-mono text-emerald-900 max-h-[200px] overflow-auto">
                {step.systemBlock}
              </pre>
            </div>
          )}

          {step.referenceImages && step.referenceImages.length > 0 && (
            <div className="rounded border bg-blue-950/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                  Images de référence jointes ({step.referenceImages.length})
                </span>
                <Badge variant="secondary" className="text-[10px]">API : {step.apiCall}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {step.referenceImages.map((img, i) => (
                  <div key={i} className="space-y-1">
                    <img
                      src={img}
                      alt={`Référence ${i + 1}`}
                      className="h-16 w-16 rounded object-cover border"
                    />
                    <div className="text-center text-[10px] font-semibold text-blue-800">
                      Image {i + 1}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Ces images sont envoyées en tant que fichiers joints à l'appel API. Le prompt ci-dessous nomme explicitement chaque image et définit son rôle.
              </p>
            </div>
          )}

          {step.referenceImages && step.referenceImages.length === 0 && step.apiCall && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">API : {step.apiCall}</Badge>
              <span className="text-[10px] text-muted-foreground">Aucune image de référence jointe.</span>
            </div>
          )}

          {step.promptId && step.editable && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Template éditable</span>
                <CopyButton text={promptValue} />
              </div>
              <Textarea
                value={promptValue}
                onChange={(e) => onUpdatePrompt(step.promptId!, e.target.value)}
                className="min-h-[120px] font-mono text-xs"
                placeholder="Saisissez le prompt..."
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Modifiez ce template et cliquez sur "Enregistrer les modifications" en haut de la page.
              </p>
            </div>
          )}

          {step.assembledPrompt && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                  {step.editable ? "Résultat assemblé (aperçu)" : "Prompt assemblé / envoyé"}
                </span>
                <CopyButton text={step.assembledPrompt} />
              </div>
              <pre className="rounded bg-amber-950/5 p-2.5 text-xs whitespace-pre-wrap break-words font-mono text-amber-900 max-h-[200px] overflow-auto">
                {step.assembledPrompt}
              </pre>
            </div>
          )}

          {step.outputPreview && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">{step.outputLabel}</span>
              </div>
              <pre className="rounded bg-purple-950/5 p-2.5 text-xs whitespace-pre-wrap break-words font-mono text-purple-900">
                {step.outputPreview}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-6 w-6"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <span className="text-[10px] font-bold text-green-600">OK</span> : <Copy className="h-3 w-3" />}
    </Button>
  );
}
