
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 prose prose-sm dark:prose-invert max-w-none">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h2>1. Introduction</h2>
          <p>
            Welcome to Visual Dashboard ("we", "us", "our"). By accessing or using our service, you agree to be bound by these Terms of Service.
          </p>

          <h2>2. Accounts</h2>
          <p>
            When you create an account with us, you must provide information that is accurate, complete, and current. You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. We use third-party services like Firebase for authentication.
          </p>

          <h2>3. Subscriptions</h2>
          <p>
            Some parts of the service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis. We use third-party payment processors (e.g., PayPal) to handle payments. We do not store your payment information.
          </p>

          <h2>4. User Data</h2>
          <p>
            Our service allows you to upload data files (e.g., CSV, XLSX) to generate visualizations. You are solely responsible for the data you upload. You grant us a limited license to process your data solely for the purpose of providing the service. We do not claim ownership of your data.
          </p>

           <h2>5. Data Storage</h2>
          <p>
            To improve your experience, we save your work (Gantt charts, Kanban boards) in your browser's `localStorage`. This data is stored locally on your device and is not sent to our servers. This local data will be automatically deleted after 30 days of inactivity.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            In no event shall Visual Dashboard, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.
          </p>
          
          <h2>7. Changes</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page.
          </p>

          <h2>8. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at elvizbiz@gmail.com.</p>
        </CardContent>
      </Card>
    </div>
  );
}
