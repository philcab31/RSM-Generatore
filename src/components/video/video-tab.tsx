"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Wand2,
  Combine,
  Video,
  ImageIcon,
  Sparkles,
  Download,
  Eye,
  AlertCircle,
} from "lucide-react";
import { useAIConfig, MODEL_OPTIONS } from "@/context/AIConfigContext";
import { useBrandIdentity } from "@/context/BrandIdentityContext";
import { applyLogoOverlay, hasLogoConfigured } from "@/lib/canvas-logo-overlay";
import type { PromptTrace } from "@/lib/ai/provider-manager";
import { PromptInspector } from "@/components/prompt-inspector";

const STYLE_OPTIONS = [
  "Cinématique hollywoodien",
  "Documentaire",
  "Animation 3D",
  "Motion design",
  "Vidéo réaliste",
  "Fantastique / SF",
  "Publicité premium",
  "Vlog / UGC",
  "Musical / Clip",
  "Minimaliste",
];

const CAMERA_OPTIONS = [
  "Drone aérien",
  "Travelling latéral",
  "Plan fixe",
  "Gros plan (macro)",
  "Contre-plongée",
  "Plongée",
  "Plan séquence",
  "Caméra à l'épaule",
  "Timelapse",
  "Dolly zoom",
];

const MOVEMENT_OPTIONS = [
  "Zoom lent entrant",
  "Zoom lent sortant",
  "Panoramique horizontal",
  "Panoramique vertical",
  "Rotation 360°",
  "Travelling avant",
  "Travelling arrière",
  "Statique",
  "Orbite circulaire",
  "Rack focus",
];

const LIGHTING_OPTIONS = [
  "Golden hour (lumière dorée)",
  "Lumière naturelle douce",
  "Éclairage néon / cyberpunk",
  "Low-key (contraste fort)",
  "High-key (clair et lumineux)",
  "Bokeh / arrière-plan flou",
  "Éclairage de studio",
  "Crépuscule / blue hour",
];

const DURATION_OPTIONS = ["2 secondes", "5 secondes", "10 secondes"];

const ASPECT_RATIO_OPTIONS = [
  { label: "16:9 paysage", value: "16:9" },
  { label: "9:16 portrait (Reels/TikTok)", value: "9:16" },
  { label: "1:1 carré", value: "1:1" },
  { label: "4:3 standard", value: "4:3" },
];

const IMAGE_TO_VIDEO_MODELS = [
  "wan-v2-2-720p-image-to-video",
  "kling-o1",
  "minimax-live",
];

export function VideoTab() {
  const { config } = useAIConfig();
  const { brand } = useBrandIdentity();

  const [scene, setScene] = useState("");
  const [style, setStyle] = useState("");
  const [camera, setCamera] = useState("");
  const [movement, setMovement] = useState("");
  const [lighting, setLighting] = useState("");
  const [duration, setDuration] = useState("5 secondes");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [model, setModel] = useState(config.videoModel);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  const [finalPrompt, setFinalPrompt] = useState("");
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTrace, setVideoTrace] = useState<PromptTrace | undefined>();
  const [showPrompt, setShowPrompt] = useState(false);
  const [error, setError] = useState("");

  const isImageToVideo = IMAGE_TO_VIDEO_MODELS.includes(model);
  const videoModels = MODEL_OPTIONS[config.videoProvider] || [];

  const combinePrompt = useCallback(() => {
    const parts = [
      scene,
      style && `Style: ${style}`,
      camera && `Camera: ${camera}`,
      movement && `Movement: ${movement}`,
      lighting && `Lighting: ${lighting}`,
      duration && `Duration: ${duration}`,
      aspectRatio && `Aspect ratio: ${aspectRatio}`,
    ].filter(Boolean);
    const combined = parts.join(". ");
    setFinalPrompt(combined);
    return combined;
  }, [scene, style, camera, movement, lighting, duration, aspectRatio]);

  const enhancePrompt = async () => {
    const base = finalPrompt || combinePrompt();
    if (!base.trim()) return;
    setEnhanceLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "video_prompt_enhance",
          provider: config.textProvider,
          model: config.textModel,
          blocks: {
            scene,
            style,
            camera,
            movement,
            lighting,
            duration,
            aspectRatio,
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      if (data.enhancedPrompt) {
        setFinalPrompt(data.enhancedPrompt);
        if (data.trace) {
          setVideoTrace(data.trace);
        }
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      console.error("Enhance prompt error:", err);
      setError(err?.message || "Erreur lors de l'amélioration du prompt");
    } finally {
      setEnhanceLoading(false);
    }
  };

  const generateStartImage = async () => {
    if (!scene.trim()) return;
    setImageLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          networkPost: scene.slice(0, 100),
          sourceContent: scene,
          platform: "instagram",
          provider: config.imageProvider,
          modelId: config.imageModel,
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
            console.warn("Logo overlay failed:", overlayErr);
          }
        }
        setImageUrl(finalImageUrl);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError("Erreur lors de la génération de l'image de départ");
    } finally {
      setImageLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner une image (JPG, PNG, WebP).");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageUrl(base64);
    };
    reader.onerror = () => {
      setError("Erreur lors de la lecture du fichier.");
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageUrl("");
    setImagePreview("");
  };

  const generateVideo = async () => {
    const prompt = finalPrompt.trim();
    if (!prompt) {
      setError("Veuillez d'abord combiner ou améliorer le prompt.");
      return;
    }
    if (isImageToVideo && !imageUrl.trim()) {
      setError("Ce modèle nécessite une image de départ. Upload une image ou générez-en une.");
      return;
    }
    setVideoLoading(true);
    setError("");
    setVideoUrl("");
    try {
      const res = await fetch("/api/ai/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: config.videoProvider,
          model,
          imageUrl: imageUrl.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
        if (data.trace) {
          setVideoTrace((prev) => {
            if (!prev) return data.trace;
            const prevSteps = prev.steps;
            const newSteps = data.trace.steps.map((s: any, i: number) => ({
              ...s,
              step: prevSteps.length + i + 1,
            }));
            return { steps: [...prevSteps, ...newSteps] };
          });
        }
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      console.error("Generate video error:", err);
      setError(err?.message || "Erreur lors de la génération de la vidéo");
    } finally {
      setVideoLoading(false);
    }
  };

  const downloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `magnific-video-${Date.now()}.mp4`;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Blocs structurés */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-5 w-5" />
            Blocs de construction vidéo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Scène / Sujet</Label>
            <Textarea
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              placeholder="Décrivez la scène principale... (ex: un café parisien au crépuscule avec des clients discutant)"
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Style visuel</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un style..." />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plan / Angle de caméra</Label>
              <Select value={camera} onValueChange={setCamera}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un plan..." />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mouvement de caméra</Label>
              <Select value={movement} onValueChange={setMovement}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un mouvement..." />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Éclairage / Ambiance</Label>
              <Select value={lighting} onValueChange={setLighting}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un éclairage..." />
                </SelectTrigger>
                <SelectContent>
                  {LIGHTING_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Durée</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format / Aspect ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIO_OPTIONS.map((ar) => (
                    <SelectItem key={ar.value} value={ar.value}>
                      {ar.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modèle vidéo</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {videoModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Provider : <Badge variant="outline">{config.videoProvider}</Badge>
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Image de départ {isImageToVideo && <span className="text-destructive">*</span>}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateStartImage}
                  disabled={imageLoading || !scene.trim()}
                  title="Générer une image de départ avec l'IA"
                >
                  {imageLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </Button>
                {imageUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearImage}
                    title="Supprimer l'image"
                  >
                    ✕
                  </Button>
                )}
              </div>
              {isImageToVideo && (
                <p className="text-xs text-muted-foreground">
                  Ce modèle est <strong>image-to-video</strong>. Upload une image ou générez-en une avec l'IA.
                </p>
              )}
            </div>
          </div>

          {(imagePreview || imageUrl) && (
            <div className="rounded-md border overflow-hidden max-w-xs relative group">
              <img
                src={imagePreview || imageUrl}
                alt="Image de départ"
                className="w-full h-32 object-cover"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prompt final */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Prompt final
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={finalPrompt}
            onChange={(e) => setFinalPrompt(e.target.value)}
            placeholder="Le prompt combiné apparaîtra ici..."
            className="min-h-[120px] resize-none"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={combinePrompt}
              disabled={!scene.trim()}
            >
              <Combine className="mr-2 h-4 w-4" />
              Combiner
            </Button>
            <Button
              variant="secondary"
              onClick={enhancePrompt}
              disabled={enhanceLoading || !finalPrompt.trim()}
            >
              {enhanceLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Améliorer avec IA
            </Button>
            <Button
              onClick={generateVideo}
              disabled={videoLoading || !finalPrompt.trim()}
              className="flex-1 md:flex-none"
            >
              {videoLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Video className="mr-2 h-4 w-4" />
              )}
              Générer la vidéo
            </Button>
          </div>

          {videoLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération en cours... Cela peut prendre plusieurs minutes. Ne fermez pas la page.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résultat vidéo */}
      {videoUrl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Vidéo générée
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={downloadVideo}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPrompt(!showPrompt)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-hidden bg-black">
              <video
                src={videoUrl}
                controls
                className="w-full max-h-[500px]"
                poster={imagePreview || imageUrl}
              />
            </div>
            {showPrompt && finalPrompt && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <strong>Prompt envoyé :</strong> {finalPrompt}
              </div>
            )}
            <PromptInspector trace={videoTrace} title="Pipeline de génération vidéo" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
