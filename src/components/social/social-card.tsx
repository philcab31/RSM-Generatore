"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Briefcase,
  Camera,
  ThumbsUp,
  Send,
  Copy,
  ImageIcon,
  Loader2,
  Eye,
  Save,
  Trash2,
} from "lucide-react";
import type { SocialPlatform, PromptTrace } from "@/lib/ai/provider-manager";
import type { AIProvider } from "@/lib/ai/server-keys";
import { useAIConfig } from "@/context/AIConfigContext";
import { useBrandIdentity } from "@/context/BrandIdentityContext";
import { saveImage } from "@/lib/image-store";
import { applyLogoOverlay, hasLogoConfigured } from "@/lib/canvas-logo-overlay";
import { PromptInspector } from "@/components/prompt-inspector";

const PLATFORM_CONFIG: Record<
  SocialPlatform,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    maxChars: number;
  }
> = {
  twitter: {
    label: "Twitter / X",
    icon: MessageCircle,
    color: "text-[#1DA1F2]",
    bg: "bg-[#1DA1F2]/10",
    maxChars: 280,
  },
  linkedin: {
    label: "LinkedIn",
    icon: Briefcase,
    color: "text-[#0A66C2]",
    bg: "bg-[#0A66C2]/10",
    maxChars: 3000,
  },
  instagram: {
    label: "Instagram",
    icon: Camera,
    color: "text-[#3B82F6]",
    bg: "bg-[#3B82F6]/10",
    maxChars: 2200,
  },
  facebook: {
    label: "Facebook",
    icon: ThumbsUp,
    color: "text-[#1877F2]",
    bg: "bg-[#1877F2]/10",
    maxChars: 500,
  },
  telegram: {
    label: "Telegram",
    icon: Send,
    color: "text-[#26A5E4]",
    bg: "bg-[#26A5E4]/10",
    maxChars: 1000,
  },
};

interface SocialCardProps {
  platform: SocialPlatform;
  sourceContent: string;
  provider: AIProvider;
}

export function SocialCard({ platform, sourceContent, provider }: SocialCardProps) {
  const platformConfig = PLATFORM_CONFIG[platform];
  const { config } = useAIConfig();
  const { brand } = useBrandIdentity();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState("");
  const [imageTrace, setImageTrace] = useState<PromptTrace | undefined>();

  const generate = async () => {
    if (!sourceContent.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "social_post",
          sourceContent,
          platform,
          provider,
          model: config.socialModel,
        }),
      });
      const data = await res.json();
      if (data.text) {
        setText(data.text);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!text.trim()) return;
    setImageLoading(true);
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          networkPost: text,
          sourceContent,
          platform,
          provider: config.imageProvider,
          model: config.imageModel,
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        let finalImageUrl = data.imageUrl;
        if (hasLogoConfigured(brand.logoBase64)) {
          try {
            finalImageUrl = await applyLogoOverlay(
              data.imageUrl,
              brand.logoBase64!,
              brand.logoPosition,
              brand.logoSize,
              brand.logoOpacity
            );
          } catch (overlayErr) {
            console.warn("Logo overlay failed, using original image:", overlayErr);
          }
        }
        setImageUrl(finalImageUrl);
        setFinalPrompt(data.finalPrompt || "");
        setImageTrace(data.trace);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImageLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
  };

  const savePost = async () => {
    if (!text.trim()) return;
    const id = crypto.randomUUID();
    const saved: Array<{
      id: string;
      platform: SocialPlatform;
      text: string;
      imageId: string | null;
      savedAt: string;
    }> = JSON.parse(localStorage.getItem("saved_posts") || "[]");

    // Limiter à 30 posts pour éviter de saturer localStorage
    while (saved.length >= 30) {
      const removed = saved.shift();
      const removedImageId = removed?.imageId;
      if (removedImageId) {
        // Supprimer l'image associée de IndexedDB (fire-and-forget)
        import("@/lib/image-store").then((m) => m.deleteImage(removedImageId)).catch(() => {});
      }
    }

    const imageId = imageUrl ? id + "_img" : null;
    if (imageId && imageUrl) {
      await saveImage(imageId, imageUrl);
    }

    saved.push({
      id,
      platform,
      text,
      imageId,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem("saved_posts", JSON.stringify(saved));
  };

  const clearCard = () => {
    setText("");
    setImageUrl(null);
    setFinalPrompt("");
    setShowPrompt(false);
    setImageTrace(undefined);
  };

  const charCount = text.length;
  const isOverLimit = charCount > platformConfig.maxChars;

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className={`${platformConfig.bg} rounded-t-xl -mx-6 -mt-6 px-6 pt-6 pb-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <platformConfig.icon className={`h-5 w-5 ${platformConfig.color}`} />
            <span className="font-semibold">{platformConfig.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={savePost}
              disabled={!text.trim()}
              title="Enregistrer"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={clearCard}
              title="Vider"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Badge variant={isOverLimit ? "destructive" : "secondary"}>
              {charCount} / {platformConfig.maxChars}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-4 flex-1">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Contenu ${platformConfig.label}...`}
          className="min-h-[120px] resize-none flex-1"
        />

        {imageUrl && (
          <div className="rounded-md border overflow-hidden">
            <img
              src={imageUrl}
              alt={`Illustration ${platformConfig.label}`}
              className="w-full h-40 object-cover"
            />
          </div>
        )}

        {showPrompt && finalPrompt && (
          <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            <strong>Prompt final :</strong> {finalPrompt}
          </div>
        )}

        <PromptInspector trace={imageTrace} title="Pipeline de génération d'image" />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            data-generate-all
            onClick={generate}
            disabled={loading || !sourceContent.trim()}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Générer
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={copyToClipboard}
            disabled={!text}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={generateImage}
            disabled={imageLoading || !text}
          >
            {imageLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </Button>
          {finalPrompt && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPrompt(!showPrompt)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
