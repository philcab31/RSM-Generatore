import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RedactionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rédaction</h1>
        <p className="text-muted-foreground mt-2">
          Générez des articles de blog complets via IA.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Article Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Cette section sera implémentée dans la phase P5.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
