
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 prose prose-sm dark:prose-invert max-w-none">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us when you create an account, such as your name and email address. We use third-party services like Firebase Authentication (Google, GitHub) for this purpose.
          </p>
          
          <h2>2. Use of Information</h2>
          <p>
            We use the information we collect to operate, maintain, and provide you with the features and functionality of the service.
          </p>

          <h2>3. Data You Upload</h2>
          <p>
            The data you upload for visualization (e.g., CSV, XLSX files) is processed in your browser. We do not store, transmit, or have access to the contents of your data files. All processing happens client-side.
          </p>

          <h2>4. Local Storage</h2>
          <p>
            To enhance your experience, we save your Gantt charts and Kanban boards in your browser's `localStorage`. This data is stored only on your computer and is not transmitted to us. This data is automatically cleared after 30 days of inactivity. You can clear this data at any time by clearing your browser's cache and site data.
          </p>

          <h2>5. Third-Party Services</h2>
          <p>
            We may use third-party services for authentication (Firebase) and payment processing (PayPal). These services have their own privacy policies, and we encourage you to read them.
          </p>
          
           <h2>6. Security</h2>
          <p>
            We are committed to protecting your information. However, please remember that no method of transmission over the Internet or method of electronic storage is 100% secure.
          </p>

          <h2>7. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>

          <h2>8. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at elvizbiz@gmail.com.</p>
        </CardContent>
      </Card>
    </div>
  );
}
