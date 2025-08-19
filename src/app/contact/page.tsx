import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Contact Us</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Have questions or want to learn more? Reach out to us.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <Mail className="h-5 w-5 text-primary" />
            <a href="mailto:support@datasight.com" className="hover:underline">support@datasight.com</a>
          </div>
          <div className="flex items-center gap-4">
            <Phone className="h-5 w-5 text-primary" />
            <span>+1 (555) 123-4567</span>
          </div>
          <div className="flex items-center gap-4">
            <MapPin className="h-5 w-5 text-primary" />
            <span>123 Data Drive, Visualization City, DC 54321</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
