
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">About Visual Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Visual Dashboard is a powerful, open-source data visualization tool that empowers you to
            turn raw data into beautiful, interactive dashboards. Simply upload your CSV,
            XLS, or XLSX files, and let our intelligent engine generate insightful charts and
            key metrics. With AI-powered chart suggestions, you can uncover hidden patterns
            and make data-driven decisions with ease.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
