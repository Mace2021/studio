
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, FileUp, MousePointerClick, Download, BarChart, Settings } from "lucide-react";
import Image from 'next/image';

const tutorialSteps = [
    {
        icon: FileUp,
        title: "Upload Your Data",
        description: "Click the 'Upload Data' button and select your CSV, XLS, or XLSX file. The app will automatically read your data and generate a set of initial charts to get you started.",
    },
    {
        icon: BarChart,
        title: "Explore AI-Suggested Charts",
        description: "Review the automatically generated charts. These are suggested by AI to give you a quick overview of your data's key insights.",
    },
    {
        icon: Settings,
        title: "Customize Your Dashboard",
        description: "Use the controls for each chart to change the chart type, select different columns for the axes, or group data by categories. Add new charts using the 'Add Chart' button.",
    },
    {
        icon: MousePointerClick,
        title: "Filter Interactively",
        description: "Click on data points within a chart (like a bar or a pie slice) to filter the entire dashboard. This allows you to drill down and see relationships in your data. Click 'Clear Filter' to return to the full view.",
    },
    {
        icon: Download,
        title: "Export Your PDF",
        description: "Once your dashboard is ready, click the 'Export PDF' button. You can choose the page orientation and layout to create a professional, shareable report. Then add your notes and comments below.",
    }
]

export default function TutorialPage() {
  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <Lightbulb className="h-6 w-6 text-primary" />
            How to use Visualdash.net
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            {tutorialSteps.map((step, index) => (
                 <div key={index} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <step.icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold">{step.title}</h3>
                        <p className="text-muted-foreground text-sm">{step.description}</p>
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>

       <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Sample PDF Exports</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Portrait Layout: One chart per page</h3>
                 <div className="overflow-hidden rounded-lg border shadow-md">
                    <Image 
                        src="/exportpdfonechartperpageportrait.png" 
                        alt="Sample PDF in Portrait"
                        data-ai-hint="dashboard portrait"
                        width={400}
                        height={565}
                        className="w-full h-auto"
                    />
                 </div>
            </div>
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Portrait Layout: Two charts per page</h3>
                 <div className="overflow-hidden rounded-lg border shadow-md">
                    <Image 
                        src="/exportpdftwochartperpageportrait.png" 
                        alt="Sample PDF in Portrait"
                        data-ai-hint="dashboard portrait"
                        width={400}
                        height={565}
                        className="w-full h-auto"
                    />
                 </div>
            </div>
          
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Landscape Layout: One chart per page</h3>
                <div className="overflow-hidden rounded-lg border shadow-md">
                     <Image 
                        src="/exportpdfonechartperpagelandscape.png" 
                        alt="Sample PDF in Landscape"
                        data-ai-hint="dashboard landscape"
                        width={800}
                        height={565}
                        className="w-full h-auto"
                    />
                </div>
            </div>
             <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Landscape Layout: Two charts per page</h3>
                <div className="overflow-hidden rounded-lg border shadow-md">
                     <Image 
                        src="/exportpdftwochartperpagelandscape.png" 
                        alt="Sample PDF in Landscape"
                        data-ai-hint="dashboard landscape"
                        width={800}
                        height={565}
                        className="w-full h-auto"
                    />
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
