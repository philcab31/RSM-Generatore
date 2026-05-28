"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  Copy,
  Download,
  Images,
} from "lucide-react";
import { useAIConfig } from "@/context/AIConfigContext";
import { useBrandIdentity } from "@/context/BrandIdentityContext";
import { applyLogoOverlay, hasLogoConfigured } from "@/lib/canvas-logo-overlay";
import type { CarouselPlatform, CarouselSlide, PromptTrace } from "@/lib/ai/provider-manager";
import { PromptInspector } from "@/components/prompt-inspector";

const CAROUSEL_PLATFORMS: { id: CarouselPlatform; label: string; maxSlides: number; minSlides: number }[] = [
  { id: "instagram", label: "Instagram", maxSlides: 10, minSlides: 1 },
  { id: "linkedin", label: "LinkedIn (PDF)", maxSlides: 10, minSlides: 6 },
  { id: "facebook", label: "Facebook", maxSlides: 10, minSlides: 3 },
  { id: "twitter", label: "X (Twitter)", maxSlides: 6, minSlides: 2 },
  { id: "tiktok", label: "TikTok", maxSlides: 35, minSlides: 3 },
];

interface CarouselData {
  title: string;
  slides: CarouselSlide[];
  visualStyle?: string;
}

export function CarouselTab() {
  const { config } = useAIConfig();
  const { brand } = useBrandIdentity();
  const [sourceContent, setSourceContent] = useState("");
  const [platform, setPlatform] = useState<CarouselPlatform>("instagram");
  const [carousel, setCarousel] = useState<CarouselData | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [slideTraces, setSlideTraces] = useState<Record<number, PromptTrace>>({});

  const platformConfig = CAROUSEL_PLATFORMS.find((p) => p.id === platform)!;

  const generateScript = async () => {
    if (!sourceContent.trim()) return;
    setScriptLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "carousel_script",
          sourceContent,
          platform,
          provider: config.textProvider,
          model: config.textModel,
        }),
      });
      const data = await res.json();
      if (data.slides) {
        setCarousel({
          title: data.title || "Carrousel",
          slides: data.slides,
          visualStyle: data.visualStyle,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScriptLoading(false);
    }
  };

  const generateSlideImage = async (index: number) => {
    if (!carousel) return;
    const slide = carousel.slides[index];
    setImageLoading((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          networkPost: slide.text,
          sourceContent,
          platform,
          provider: config.imageProvider,
          visualStyle: carousel.visualStyle,
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
        setSlideImages((prev) => ({ ...prev, [index]: finalImageUrl }));
        if (data.trace) {
          setSlideTraces((prev) => ({ ...prev, [index]: data.trace }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImageLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const updateSlide = (index: number, field: "title" | "text", value: string) => {
    if (!carousel) return;
    const next = [...carousel.slides];
    next[index] = { ...next[index], [field]: value };
    setCarousel({ ...carousel, slides: next });
  };

  const addSlide = () => {
    if (!carousel) return;
    if (carousel.slides.length >= platformConfig.maxSlides) return;
    setCarousel({
      ...carousel,
      slides: [...carousel.slides, { title: "Nouvelle slide", text: "" }],
    });
  };

  const removeSlide = (index: number) => {
    if (!carousel) return;
    if (carousel.slides.length <= platformConfig.minSlides) return;
    const next = carousel.slides.filter((_, i) => i !== index);
    setCarousel({ ...carousel, slides: next });
    setSlideImages((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    if (!carousel) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= carousel.slides.length) return;
    const next = [...carousel.slides];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setCarousel({ ...carousel, slides: next });
  };

  const generateAllImages = async () => {
    if (!carousel) return;
    for (let i = 0; i < carousel.slides.length; i++) {
      await generateSlideImage(i);
    }
  };

  const copyAllTexts = () => {
    if (!carousel) return;
    const text = carousel.slides.map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.text}`).join("\n\n");
    navigator.clipboard.writeText(text);
  };

  const downloadAllImages = () => {
    Object.entries(slideImages).forEach(([index, url]) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = `slide-${Number(index) + 1}.png`;
      a.click();
    });
  };

  return (
    <div className="space-y-6">
      {/* Source input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contenu source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={sourceContent}
            onChange={(e) => setSourceContent(e.target.value)}
            placeholder="Collez votre texte, article ou sujet ici..."
            className="min-h-[150px]"
          />
          <div className="flex flex-wrap gap-2">
            {CAROUSEL_PLATFORMS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={platform === p.id ? "default" : "outline"}
                onClick={() => setPlatform(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Button
            onClick={generateScript}
            disabled={scriptLoading || !sourceContent.trim()}
            className="w-full"
          >
            {scriptLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Générer le script ({platformConfig.minSlides}-{platformConfig.maxSlides} slides)
          </Button>
        </CardContent>
      </Card>

      {/* Slides editor */}
      {carousel && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{carousel.title}</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyAllTexts}>
                <Copy className="h-4 w-4 mr-2" />
                Copier les textes
              </Button>
              {Object.keys(slideImages).length > 0 && (
                <Button size="sm" variant="outline" onClick={downloadAllImages}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger les images
                </Button>
              )}
              <Button
                size="sm"
                variant="default"
                onClick={generateAllImages}
                disabled={Object.values(imageLoading).some(Boolean)}
              >
                <Images className="h-4 w-4 mr-2" />
                Générer toutes les images
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {carousel.slides.map((slide, index) => (
              <Card key={index} className="flex flex-col overflow-hidden">
                <CardHeader className="bg-muted/50 pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Slide {index + 1}</Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => moveSlide(index, -1)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => moveSlide(index, 1)}
                        disabled={index === carousel.slides.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => removeSlide(index)}
                        disabled={carousel.slides.length <= platformConfig.minSlides}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 flex-1">
                  <Input
                    value={slide.title}
                    onChange={(e) => updateSlide(index, "title", e.target.value)}
                    placeholder="Titre de la slide..."
                  />
                  <Textarea
                    value={slide.text}
                    onChange={(e) => updateSlide(index, "text", e.target.value)}
                    placeholder="Texte de la slide..."
                    className="min-h-[100px] resize-none flex-1"
                  />

                  {slideImages[index] && (
                    <div className="rounded-md border overflow-hidden">
                      <img
                        src={slideImages[index]}
                        alt={`Slide ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => generateSlideImage(index)}
                    disabled={imageLoading[index]}
                  >
                    {imageLoading[index] ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ImageIcon className="h-4 w-4 mr-2" />
                    )}
                    {slideImages[index] ? "Régénérer l'image" : "Générer l'image"}
                  </Button>

                  <PromptInspector
                    trace={slideTraces[index]}
                    title={`Pipeline — Slide ${index + 1}`}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {carousel.slides.length < platformConfig.maxSlides && (
            <Button
              variant="outline"
              className="w-full"
              onClick={addSlide}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une slide
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
