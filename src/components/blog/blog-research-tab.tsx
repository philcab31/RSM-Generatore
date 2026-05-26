"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAIConfig } from "@/context/AIConfigContext";
import {
  Search,
  Loader2,
  FileText,
  CheckSquare,
  Square,
  Wand2,
  BookOpen,
} from "lucide-react";

interface FindingItem {
  id: string;
  text: string;
  selected: boolean;
}

export function BlogResearchTab() {
  const { config } = useAIConfig();
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Expert & Rassurant");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [researchLoading, setResearchLoading] = useState(false);
  const [articleLoading, setArticleLoading] = useState(false);
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [article, setArticle] = useState<{ title: string; content: string } | null>(null);
  const [error, setError] = useState("");

  const handleResearch = async () => {
    if (!topic.trim()) return;
    setResearchLoading(true);
    setError("");
    setFindings([]);
    setSources([]);
    setArticle(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "research",
          topics: topic,
          provider: config.researchProvider,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      // Parse findings into selectable items
      // Only keep top-level numbered lines (1. 2. 3.) and ignore sub-points/intro/conclusion
      const lines = (data.findings || "")
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => /^\d+\.\s+/.test(line));

      const items: FindingItem[] = lines.map((line: string, i: number) => ({
        id: `f-${i}`,
        text: line.replace(/^\d+\.\s*/, "").trim(),
        selected: true,
      }));

      // Limit to 10 items max to avoid overflow
      const limitedItems = items.slice(0, 10);
      setFindings(limitedItems.length > 0 ? limitedItems : [{ id: "f-0", text: data.findings, selected: true }]);
      setSources(data.sources || []);
    } catch {
      setError("Erreur lors de la recherche");
    } finally {
      setResearchLoading(false);
    }
  };

  const toggleFinding = (id: string) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f))
    );
  };

  const selectAll = () => {
    setFindings((prev) => prev.map((f) => ({ ...f, selected: true })));
  };

  const deselectAll = () => {
    setFindings((prev) => prev.map((f) => ({ ...f, selected: false })));
  };

  const handleGenerateArticle = async () => {
    const selected = findings.filter((f) => f.selected);
    if (selected.length === 0 || !topic.trim()) return;

    setArticleLoading(true);
    setError("");

    // Construire le sujet reel a partir des points selectionnes (pas le sujet de recherche original)
    const selectedTopics = selected.map((f) => f.text).join(" ; ");
    const deepResearchTopic = `Approfondissement sur : ${selectedTopics}`;

    try {
      // Étape 1 : Recherche approfondie sur les themes choisis
      const researchRes = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "research",
          topics: deepResearchTopic,
          provider: config.researchProvider,
          model: config.researchModel,
        }),
      });
      const researchData = await researchRes.json();
      if (researchData.error) {
        setError(researchData.error);
        setArticleLoading(false);
        return;
      }

      // Étape 2 : Draft avec le contenu approfondi
      const articleTopic = `${selectedTopics}\n\nCONTEXTE ET DONNEES A INTEGRER :\n${researchData.findings || ""}`;

      const draftRes = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "article_draft",
          topics: articleTopic,
          tone,
          lengthTarget: length,
          provider: config.textProvider,
          model: config.textModel,
        }),
      });
      const draftData = await draftRes.json();
      if (draftData.error) {
        setError(draftData.error);
        setArticleLoading(false);
        return;
      }

      // Étape 3 : Enrichissement
      const enrichRes = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "article_enrich",
          content: draftData.content,
          provider: config.textProvider,
          model: config.textModel,
        }),
      });
      const enrichData = await enrichRes.json();
      if (enrichData.error) {
        setError(enrichData.error);
        setArticleLoading(false);
        return;
      }

      setArticle({ title: draftData.title, content: enrichData.content });
    } catch {
      setError("Erreur lors de la generation de l article");
    } finally {
      setArticleLoading(false);
    }
  };

  const selectedCount = findings.filter((f) => f.selected).length;

  return (
    <div className="space-y-6">
      {/* Section recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Recherche de sujets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex : Les 10 sujets importants des 30 derniers jours concernant les orthophonistes"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleResearch}
              disabled={researchLoading || !topic.trim()}
            >
              {researchLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Rechercher
            </Button>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          {findings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedCount} / {findings.length} sélectionné(s)
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Coche les points à inclure dans l'article
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={selectAll}>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Tout
                  </Button>
                  <Button size="sm" variant="ghost" onClick={deselectAll}>
                    <Square className="h-4 w-4 mr-1" />
                    Aucun
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-3">
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="flex items-start gap-3 p-2 hover:bg-muted rounded-md transition-colors"
                  >
                    <Checkbox
                      id={finding.id}
                      checked={finding.selected}
                      onCheckedChange={() => toggleFinding(finding.id)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={finding.id}
                      className="text-sm cursor-pointer flex-1 leading-relaxed"
                    >
                      {finding.text}
                    </Label>
                  </div>
                ))}
              </div>

              {sources.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Sources :{" "}
                  {sources.map((s, i) => (
                    <span key={i}>
                      <a
                        href={s}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-primary"
                      >
                        {new URL(s).hostname}
                      </a>
                      {i < sources.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Options article */}
      {findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Génération de l'article
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ton</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Expert & Rassurant">
                      Expert & Rassurant
                    </SelectItem>
                    <SelectItem value="Pédagogique">Pédagogique</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Neutre">Neutre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Longueur</Label>
                <Select
                  value={length}
                  onValueChange={(v) => setLength(v as "short" | "medium" | "long")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Court (400-600 mots)</SelectItem>
                    <SelectItem value="medium">Moyen (800-1200 mots)</SelectItem>
                    <SelectItem value="long">Long (1500-2500 mots)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerateArticle}
              disabled={articleLoading || selectedCount === 0}
              className="w-full"
            >
              {articleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Générer l'article ({selectedCount} point{selectedCount > 1 ? "s" : ""} sélectionné
              {selectedCount > 1 ? "s" : ""})
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Résultat article */}
      {article && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {article.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={article.content}
              onChange={(e) =>
                setArticle({ ...article, content: e.target.value })
              }
              className="min-h-[400px] font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  navigator.clipboard.writeText(article.content)
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                Copier le contenu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
