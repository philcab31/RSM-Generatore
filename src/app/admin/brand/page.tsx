"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrandIdentity } from "@/context/BrandIdentityContext";
import type { BrandIdentity, LogoPosition } from "@/lib/brand-identity";
import { defaultBrandIdentity } from "@/lib/brand-identity";
import { Loader2, Upload, RotateCcw, Palette, Target, Image as ImageIcon, Save, X } from "lucide-react";

const LOGO_POSITIONS: { value: LogoPosition; label: string }[] = [
  { value: "top-left", label: "Haut gauche" },
  { value: "top-right", label: "Haut droite" },
  { value: "center", label: "Centre" },
  { value: "bottom-left", label: "Bas gauche" },
  { value: "bottom-right", label: "Bas droite" },
];

function LogoPreviewCanvas({
  logoBase64,
  position,
  size,
  opacity,
}: {
  logoBase64?: string;
  position: LogoPosition;
  size: number;
  opacity: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 300;
    const H = 200;
    canvas.width = W;
    canvas.height = H;

    // Background placeholder (gradient)
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, "#e2e8f0");
    grd.addColorStop(1, "#cbd5e1");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Placeholder text
    ctx.fillStyle = "#64748b";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Image générée", W / 2, H / 2 - 6);
    ctx.fillText("(aperçu)", W / 2, H / 2 + 10);

    if (!logoBase64) return;

    const img = new Image();
    img.onload = () => {
      const logoW = (W * size) / 100;
      const ratio = img.height / img.width;
      const logoH = logoW * ratio;

      let x = 0;
      let y = 0;
      const padding = 12;

      switch (position) {
        case "top-left":
          x = padding;
          y = padding;
          break;
        case "top-right":
          x = W - logoW - padding;
          y = padding;
          break;
        case "bottom-left":
          x = padding;
          y = H - logoH - padding;
          break;
        case "bottom-right":
          x = W - logoW - padding;
          y = H - logoH - padding;
          break;
        case "center":
          x = (W - logoW) / 2;
          y = (H - logoH) / 2;
          break;
      }

      ctx.globalAlpha = opacity / 100;
      ctx.drawImage(img, x, y, logoW, logoH);
      ctx.globalAlpha = 1;
    };
    img.src = logoBase64;
  }, [logoBase64, position, size, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-md border w-full"
      style={{ maxWidth: 300, height: 200 }}
    />
  );
}

export default function BrandPage() {
  const { brand, updateBrand, forceSave, resetBrand, isLoading, isSaving } = useBrandIdentity();
  const [local, setLocal] = useState<BrandIdentity>(defaultBrandIdentity);
  const [justSaved, setJustSaved] = useState(false);

  // Sync local state when brand loads from server
  useEffect(() => {
    setLocal(brand);
  }, [brand]);

  // Clear "just saved" indicator after a delay
  useEffect(() => {
    if (justSaved) {
      const t = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [justSaved]);

  const handleChange = useCallback(
    (field: keyof BrandIdentity, value: string | number) => {
      setLocal((prev) => ({ ...prev, [field]: value } as BrandIdentity));
      updateBrand({ [field]: value });
    },
    [updateBrand]
  );

  const handleColorChange = useCallback(
    (index: number, patch: Partial<BrandIdentity['colors'][number]>) => {
      const nextColors = local.colors.map((c, i) => (i === index ? { ...c, ...patch } : c));
      setLocal((prev) => ({ ...prev, colors: nextColors }));
      updateBrand({ colors: nextColors });
    },
    [updateBrand, local.colors]
  );

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const currentCount = local.referenceImages?.length || 0;
    const remainingSlots = 3 - currentCount;
    if (remainingSlots <= 0) {
      alert("Maximum 3 images de référence.");
      return;
    }
    const toProcess = files.slice(0, remainingSlots);
    const newImages: string[] = [];
    let processed = 0;
    toProcess.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        alert(`Image "${file.name}" trop volumineuse (max 2 Mo).`);
        processed++;
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        newImages.push(reader.result as string);
        processed++;
        if (processed === toProcess.length) {
          const updated = [...(local.referenceImages || []), ...newImages].slice(0, 3);
          setLocal((prev) => ({ ...prev, referenceImages: updated }));
          updateBrand({ referenceImages: updated });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReferenceImage = (index: number) => {
    const updated = (local.referenceImages || []).filter((_, i) => i !== index);
    setLocal((prev) => ({ ...prev, referenceImages: updated }));
    updateBrand({ referenceImages: updated });
  };

  const handleSave = async () => {
    await forceSave(local);
    setJustSaved(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo trop volumineux (max 2 Mo). Utilisez un PNG transparent de préférence.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      handleChange("logoBase64", base64);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    if (confirm("Réinitialiser toute la direction artistique ? Cette action est irréversible.")) {
      resetBrand();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Direction Artistique</h1>
          <p className="text-muted-foreground">
            Définissez votre identité de marque, votre cible et vos contraintes visuelles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sauvegarde...
            </span>
          )}
          {justSaved && !isSaving && (
            <span className="text-sm text-green-600 font-medium">✓ Sauvegardé</span>
          )}
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      <Tabs defaultValue="identity">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="identity">
            <Target className="h-4 w-4 mr-2 hidden sm:inline" />
            Identité & Cible
          </TabsTrigger>
          <TabsTrigger value="visual">
            <Palette className="h-4 w-4 mr-2 hidden sm:inline" />
            Design System
          </TabsTrigger>
          <TabsTrigger value="references">
            <ImageIcon className="h-4 w-4 mr-2 hidden sm:inline" />
            Références
          </TabsTrigger>
          <TabsTrigger value="logo">
            <ImageIcon className="h-4 w-4 mr-2 hidden sm:inline" />
            Logo & Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Identité de marque</CardTitle>
              <CardDescription>
                Ces informations seront injectées dans tous les prompts de génération de texte.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
                  <Input
                    id="companyName"
                    value={local.companyName}
                    onChange={(e) => handleChange("companyName", e.target.value)}
                    placeholder="Ex: Vega / Epsilog CGM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Baseline / Slogan</Label>
                  <Input
                    id="tagline"
                    value={local.tagline}
                    onChange={(e) => handleChange("tagline", e.target.value)}
                    placeholder="Ex: La santé connectée pour tous"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience">Cible prioritaire</Label>
                <Textarea
                  id="targetAudience"
                  value={local.targetAudience}
                  onChange={(e) => handleChange("targetAudience", e.target.value)}
                  placeholder="Ex: infirmières libérales de 30 à 50 ans, en zone rurale ou péri-urbaine, sensibilisées à la digitalisation"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetExclusions">Exclusions de cible</Label>
                <Textarea
                  id="targetExclusions"
                  value={local.targetExclusions}
                  onChange={(e) => handleChange("targetExclusions", e.target.value)}
                  placeholder="Ex: exclure les paramédicaux hospitaliers, les étudiants en médecine, le grand public non soignant"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="toneOfVoice">Ton de voix</Label>
                <Textarea
                  id="toneOfVoice"
                  value={local.toneOfVoice}
                  onChange={(e) => handleChange("toneOfVoice", e.target.value)}
                  placeholder="Ex: rassurant, expert mais accessible. Pas de jargon médical excessif. Privilégier l'empathie et la pédagogie."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="forbiddenTopics">Sujets / mentions à éviter</Label>
                <Textarea
                  id="forbiddenTopics"
                  value={local.forbiddenTopics}
                  onChange={(e) => handleChange("forbiddenTopics", e.target.value)}
                  placeholder="Ex: ne jamais mentionner la concurrence DirectX. Éviter les promesses de guérison. Ne pas utiliser le terme 'patient' pour désigner les usagers."
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visual" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Design system visuel</CardTitle>
              <CardDescription>
                Ces consignes guideront le style des images et carrousels générés.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Palette de couleurs (max 5)</Label>
                <div className="space-y-2">
                  {local.colors.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-md border">
                      <input
                        type="checkbox"
                        checked={color.enabled}
                        onChange={(e) => handleColorChange(idx, { enabled: e.target.checked })}
                        className="h-4 w-4 shrink-0"
                        title="Utiliser cette couleur dans les prompts"
                      />
                      <input
                        type="color"
                        value={color.hex}
                        onChange={(e) => handleColorChange(idx, { hex: e.target.value })}
                        className="h-8 w-8 rounded border p-0 cursor-pointer shrink-0"
                      />
                      <Input
                        value={color.name}
                        onChange={(e) => handleColorChange(idx, { name: e.target.value })}
                        placeholder={`Couleur ${idx + 1}`}
                        className="flex-1 text-sm"
                      />
                      <Input
                        value={color.hex}
                        onChange={(e) => handleColorChange(idx, { hex: e.target.value })}
                        className="w-24 font-mono text-sm shrink-0"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cochez les couleurs que l&apos;IA doit respecter dans la génération d&apos;images.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontStyle">Style typographique</Label>
                <Input
                  id="fontStyle"
                  value={local.fontStyle}
                  onChange={(e) => handleChange("fontStyle", e.target.value)}
                  placeholder="Ex: sans-serif moderne (type Inter, Geist ou Montserrat), lisible en petit format"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visualMood">Ambiance visuelle globale</Label>
                <Textarea
                  id="visualMood"
                  value={local.visualMood}
                  onChange={(e) => handleChange("visualMood", e.target.value)}
                  placeholder="Ex: flat design épuré avec touches de glassmorphisme léger. Ambiance professionnelle mais chaleureuse."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visualExclusions">Exclusions visuelles</Label>
                <Textarea
                  id="visualExclusions"
                  value={local.visualExclusions}
                  onChange={(e) => handleChange("visualExclusions", e.target.value)}
                  placeholder="Ex: pas de photos réalistes de patients reconnaissables. Pas de rouge vif dominant. Pas d'illustrations cartoon infantiles."
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="references" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Images de référence</CardTitle>
              <CardDescription>
                Uploadez 1 à 3 images pour guider le style visuel de la génération.
                Le modèle gpt-image-2 les utilisera comme entrées réelles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="refImagesUpload">Uploader des images de référence</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-dashed cursor-pointer hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">
                      Choisir des fichiers ({3 - (local.referenceImages?.length || 0)} restant(s))
                    </span>
                    <input
                      id="refImagesUpload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={handleReferenceImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  1 image = référence globale (style + sujet). 2 images = style de l&apos;image 1 appliqué au sujet de l&apos;image 2.
                  3 images = style image 1 + sujet image 2 + ambiance/composition image 3. Max 2 Mo par image.
                </p>
              </div>

              {(local.referenceImages || []).length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {(local.referenceImages || []).map((img, idx) => (
                    <div key={idx} className="relative rounded-md border overflow-hidden group">
                      <img
                        src={img}
                        alt={`Référence ${idx + 1}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeReferenceImage(idx)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 text-center">
                        Image {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo & positionnement</CardTitle>
              <CardDescription>
                Le logo sera superposé aux images générées via Canvas (post-traitement).
                Privilégiez un PNG avec fond transparent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="logoUpload">Uploader un logo</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-dashed cursor-pointer hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Choisir un fichier (max 2 Mo)</span>
                    <input
                      id="logoUpload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {local.logoBase64 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChange("logoBase64", "")}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
                {local.logoBase64 && (
                  <div className="mt-2">
                    <img
                      src={local.logoBase64}
                      alt="Logo uploadé"
                      className="h-16 w-auto rounded border"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Position du logo</Label>
                <div className="flex flex-wrap gap-2">
                  {LOGO_POSITIONS.map((pos) => (
                    <Button
                      key={pos.value}
                      type="button"
                      variant={local.logoPosition === pos.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleChange("logoPosition", pos.value)}
                    >
                      {pos.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="logoSize">
                    Taille du logo : {local.logoSize}% de la largeur image
                  </Label>
                  <input
                    id="logoSize"
                    type="range"
                    min={5}
                    max={50}
                    step={1}
                    value={local.logoSize}
                    onChange={(e) => handleChange("logoSize", Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoOpacity">
                    Opacité du logo : {local.logoOpacity}%
                  </Label>
                  <input
                    id="logoOpacity"
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={local.logoOpacity}
                    onChange={(e) => handleChange("logoOpacity", Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Aperçu du rendu</Label>
                <LogoPreviewCanvas
                  logoBase64={local.logoBase64}
                  position={local.logoPosition}
                  size={local.logoSize}
                  opacity={local.logoOpacity}
                />
                <p className="text-xs text-muted-foreground">
                  L&apos;image de fond est un placeholder. Lors de la génération réelle, le logo sera
                  superposé automatiquement sur l&apos;image IA.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
