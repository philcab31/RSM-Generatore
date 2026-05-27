"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Facebook,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type PublishMode = "n8n" | "direct";
type PostType = "text" | "photo";

interface FacebookSettings {
  mode: PublishMode;
  pageId: string;
  graphVersion: string;
}

const defaultSettings: FacebookSettings = {
  mode: "n8n",
  pageId: "",
  graphVersion: "v20.0",
};

export default function FacebookAdminPage() {
  const [settings, setSettings] = useState<FacebookSettings>(defaultSettings);
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [hasPageAccessToken, setHasPageAccessToken] = useState(false);
  const [hasN8nWebhookUrl, setHasN8nWebhookUrl] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  const [postType, setPostType] = useState<PostType>("text");
  const [textContent, setTextContent] = useState("");
  const [link, setLink] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishError, setPublishError] = useState("");
  const [lastPayload, setLastPayload] = useState("");

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/facebook/settings");
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
      setHasPageAccessToken(!!data.secrets?.hasPageAccessToken);
      setHasN8nWebhookUrl(!!data.secrets?.hasN8nWebhookUrl);
    } catch {
      setSettingsMessage("Impossible de charger la configuration Facebook.");
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async () => {
    setSettingsLoading(true);
    setSettingsMessage("");
    try {
      const res = await fetch("/api/facebook/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          pageAccessToken: pageAccessToken.trim() || undefined,
          n8nWebhookUrl: n8nWebhookUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Sauvegarde impossible");
      setSettingsMessage(data.message || "Parametres Facebook sauvegardes.");
      setPageAccessToken("");
      setN8nWebhookUrl("");
      await loadSettings();
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : "Sauvegarde impossible");
    } finally {
      setSettingsLoading(false);
    }
  };

  const publish = async () => {
    setPublishLoading(true);
    setPublishMessage("");
    setPublishError("");
    const payload = {
      page_id: settings.pageId,
      post_type: postType,
      text_content: textContent,
      media_url: postType === "photo" ? mediaUrl : undefined,
      link: postType === "text" ? link || undefined : undefined,
    };
    setLastPayload(JSON.stringify(payload, null, 2));

    try {
      const res = await fetch("/api/facebook/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Publication impossible");
      setPublishMessage(
        settings.mode === "n8n"
          ? "Payload envoye au webhook n8n."
          : "Publication envoyee a Meta Graph API."
      );
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Publication impossible");
    } finally {
      setPublishLoading(false);
    }
  };

  const canPublish =
    settings.pageId.trim() &&
    textContent.trim() &&
    (postType === "text" || mediaUrl.trim()) &&
    (settings.mode === "n8n" ? hasN8nWebhookUrl || n8nWebhookUrl.trim() : hasPageAccessToken || pageAccessToken.trim());

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10aee2]">
          Meta Graph API
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Publication Facebook</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Configure la publication automatique vers une Page Facebook professionnelle.
          Les profils personnels ne sont pas supportes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-[#1877F2]" />
            Parametres de connexion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Mode de publication</Label>
              <Select
                value={settings.mode}
                onValueChange={(value) =>
                  setSettings((current) => ({ ...current, mode: value as PublishMode }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="n8n">n8n webhook OAuth2</SelectItem>
                  <SelectItem value="direct">Meta Graph API direct</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ID de la Page Facebook</Label>
              <Input
                value={settings.pageId}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, pageId: event.target.value }))
                }
                placeholder="123456789012345"
              />
            </div>

            <div className="space-y-2">
              <Label>Version Graph API</Label>
              <Input
                value={settings.graphVersion}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, graphVersion: event.target.value }))
                }
                placeholder="v20.0"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Page Access Token</Label>
                <Badge variant={hasPageAccessToken ? "default" : "secondary"}>
                  {hasPageAccessToken ? "Configure" : "Non configure"}
                </Badge>
              </div>
              <Input
                type="password"
                value={pageAccessToken}
                onChange={(event) => setPageAccessToken(event.target.value)}
                placeholder="EAAB..."
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Requis uniquement en mode direct. Doit inclure pages_manage_posts et
                pages_read_engagement. Sauvegarde dans FACEBOOK_PAGE_ACCESS_TOKEN.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>URL webhook n8n</Label>
                <Badge variant={hasN8nWebhookUrl ? "default" : "secondary"}>
                  {hasN8nWebhookUrl ? "Configuree" : "Non configuree"}
                </Badge>
              </div>
              <Input
                type="password"
                value={n8nWebhookUrl}
                onChange={(event) => setN8nWebhookUrl(event.target.value)}
                placeholder="https://n8n.example.com/webhook/facebook-page-post"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Requis en mode n8n. Le webhook recevra page_id, post_type,
                text_content et media_url.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={saveSettings} disabled={settingsLoading}>
              {settingsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer les parametres Facebook
            </Button>
            {settingsMessage && (
              <span className="text-sm text-muted-foreground">{settingsMessage}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Publier un article sur Facebook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Type de publication</Label>
              <Select value={postType} onValueChange={(value) => setPostType(value as PostType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texte ou lien</SelectItem>
                  <SelectItem value="photo">Texte + image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Lien article facultatif</Label>
              <Input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://..."
                disabled={postType === "photo"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Texte du post</Label>
            <Textarea
              value={textContent}
              onChange={(event) => setTextContent(event.target.value)}
              placeholder="Colle ici le texte de l'article ou le post genere..."
              className="min-h-44"
            />
          </div>

          {postType === "photo" && (
            <div className="space-y-2">
              <Label>URL publique de l'image</Label>
              <Input
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="https://.../image.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Meta exige une image publiquement accessible pour l'endpoint /photos.
              </p>
            </div>
          )}

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 text-sm font-medium">Payload webhook n8n</p>
            <pre className="overflow-auto rounded-md bg-background p-3 text-xs">
              {lastPayload ||
                JSON.stringify(
                  {
                    page_id: settings.pageId || "123456789012345",
                    post_type: postType,
                    text_content: textContent || "Le texte du post ici...",
                    media_url: postType === "photo" ? mediaUrl || "https://..." : undefined,
                  },
                  null,
                  2
                )}
            </pre>
          </div>

          {publishError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {publishError}
            </div>
          )}

          {publishMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              {publishMessage}
            </div>
          )}

          <Button onClick={publish} disabled={publishLoading || !canPublish}>
            {publishLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Facebook className="h-4 w-4" />
            )}
            Publier sur Facebook
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rappels Meta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
          <p>Scopes OAuth requis : pages_manage_posts et pages_read_engagement.</p>
          <p>Le token utilise pour publier doit etre un Page Access Token, pas un User Access Token.</p>
          <p>Erreur Meta 190 : token expire ou revoque. Erreur 200-299 : permission manquante.</p>
        </CardContent>
      </Card>
    </div>
  );
}
