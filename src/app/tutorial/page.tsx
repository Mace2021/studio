
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, FileUp, MousePointerClick, Download, BarChart, Settings, GanttChartSquare, Sheet } from "lucide-react";
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
];

const ganttSteps = [
    { title: "Navigate", description: "Access the Gantt chart from the sidebar. Note: This is a premium feature and requires a subscription." },
    { title: "Add & Edit Tasks", description: "Add new tasks at the bottom of the list. Click the pencil icon next to any task to edit its name, dates, progress, assignee, and dependencies in a detailed dialog." },
    { title: "Switch Views", description: "Use the Day, Week, and Month tabs to change the timeline's zoom level to fit your planning needs." },
    { title: "Critical Path", description: "Toggle the 'Show Critical Path' switch to highlight the sequence of tasks that determines the project's total duration." },
    { title: "Use Features", description: "Use the 'Features' dropdown to share your chart, manage collaborators, view project insights, or export your task list to Excel." },
];

const kanbanSteps = [
     { title: "Navigate", description: "Access the Kanban board from the sidebar to visualize your workflow." },
     { title: "Add Tasks", description: "Click the '+' icon at the top of any column to add a new task. You can set a title, description, and start/end dates." },
     { title: "Move Tasks", description: "Drag and drop tasks between columns ('To Do', 'In Progress', 'Done') to instantly update their status." },
     { title: "Edit Tasks", description: "Hover over a task and click the pencil icon to edit its title, description, or dates directly on the card." },
     { title: "Save & Export", description: "Your board is automatically saved in your browser. Use the 'Export to Excel' button to download your current board state." },
];

export default function TutorialPage() {
  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <Lightbulb className="h-6 w-6 text-primary" />
            How to use the Dashboard
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
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <GanttChartSquare className="h-6 w-6 text-primary" />
            Using the Gantt Chart
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {ganttSteps.map((step, index) => (
                 <div key={index} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                        {index + 1}
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
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <Sheet className="h-6 w-6 text-primary" />
            Using the Kanban Board
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {kanbanSteps.map((step, index) => (
                 <div key={index} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                        {index + 1}
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
