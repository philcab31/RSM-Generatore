import Link from "next/link";
import { FileText, Image, MessageSquare, Palette, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const adminModules = [
  {
    title: "Prompts",
    description: "Modifier les prompts systeme et les consignes par format.",
    href: "/admin/prompts",
    icon: MessageSquare,
  },
  {
    title: "Configuration IA",
    description: "Controler les providers, modeles et cles attendues.",
    href: "/admin/ai-config",
    icon: Settings,
  },
  {
    title: "Marque",
    description: "Parametrer logo, couleurs, ton et references visuelles.",
    href: "/admin/brand",
    icon: Palette,
  },
  {
    title: "Redaction",
    description: "Acceder aux outils avances de generation d'articles.",
    href: "/admin/redaction",
    icon: FileText,
  },
  {
    title: "Blog",
    description: "Gerer les contenus longs et brouillons editoriaux.",
    href: "/admin/blog",
    icon: Image,
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10aee2]">
          RSMedium Generatore
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Administration</h1>
        <p className="mt-2 text-muted-foreground">
          Espace expert pour configurer les prompts, la marque et les providers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminModules.map((module) => (
          <Link key={module.href} href={module.href}>
            <Card className="h-full cursor-pointer transition-colors hover:border-[#10aee2]/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{module.title}</CardTitle>
                <module.icon className="h-4 w-4 text-[#10aee2]" />
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-5 text-muted-foreground">
                  {module.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
