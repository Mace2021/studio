"use client";

import { useState, useRef, useEffect } from "react";
import * as xlsx from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { BarChart, File, Columns, Rows, Plus, BrainCircuit, Download, Loader2, MessageCircleQuestion, Sparkles } from "lucide-react";
import { suggestCharts } from "@/ai/flows/suggest-charts-flow";
import { askQuestion } from "@/ai/flows/ask-question-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChartControls } from "./chart-controls";
import { ChartView } from "./chart-view";
import { DataTable } from "./data-table";
import type { ChartConfig, DataRow } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export default function DashboardPage() {
  const [data, setData] = useState<DataRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);
  const [layoutCols, setLayoutCols] = useState(2);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const { toast } = useToast();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileData = e.target?.result;
        const workbook = xlsx.read(fileData, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json<DataRow>(worksheet);

        if (jsonData.length > 0) {
          setData(jsonData);
          setHeaders(Object.keys(jsonData[0]));
          setChartConfigs([]);
          setAiSuggestions([]);
          setQuestion("");
          setAnswer("");
          toast({ title: "Success", description: "File uploaded and parsed successfully." });
        } else {
            throw new Error("No data found in file.");
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to parse the file. Please check the file format.",
        });
      }
    };
    reader.onerror = () => {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to read the file.",
        });
    }
    reader.readAsBinaryString(file);
  };
  
  const handleExportPDF = async () => {
    const dashboardElement = dashboardRef.current;
    if (!dashboardElement) return;

    toast({ title: "Exporting PDF...", description: "Please wait while we generate your PDF." });

    try {
        const canvas = await html2canvas(dashboardElement, {
            scale: 2,
            backgroundColor: "#0F172A",
            useCORS: true,
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "px",
            format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`datasight-dashboard-${new Date().toISOString()}.pdf`);
    } catch(error) {
        console.error("Failed to export PDF", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to export dashboard as PDF." });
    }
  };

  const handleAddChart = () => {
    if (!isClient) return;
    const newChart: ChartConfig = {
      id: `chart-${Date.now()}-${Math.random()}`,
      type: "bar",
      xAxis: headers[0] || "",
      yAxis: headers[1] || headers[0] || "",
    };
    setChartConfigs([...chartConfigs, newChart]);
  };

  const handleUpdateChart = (updatedConfig: ChartConfig) => {
    setChartConfigs(
      chartConfigs.map((c) => (c.id === updatedConfig.id ? updatedConfig : c))
    );
  };

  const handleRemoveChart = (id: string) => {
    setChartConfigs(chartConfigs.filter((c) => c.id !== id));
  };
  
  const handleGetAiSuggestions = async () => {
    if (data.length === 0) {
        toast({ variant: "destructive", title: "No Data", description: "Please upload data before getting suggestions." });
        return;
    }
    setLoadingSuggestions(true);
    setAiSuggestions([]);
    try {
        const dataSample = data.slice(0, 5);
        const result = await suggestCharts({ columnHeaders: headers, dataSample });
        if (result && result.suggestions) {
            setAiSuggestions(result.suggestions);
        } else {
            throw new Error("No suggestions returned from AI.");
        }
    } catch (error) {
        console.error("AI suggestion error:", error);
        toast({ variant: "destructive", title: "AI Error", description: "Could not fetch chart suggestions." });
    } finally {
        setLoadingSuggestions(false);
    }
  };

  const handleAskQuestion = async () => {
    if (data.length === 0 || !question) {
        toast({ variant: "destructive", title: "Missing Input", description: "Please upload data and enter a question." });
        return;
    }
    setLoadingAnswer(true);
    setAnswer("");
    try {
        const dataSample = data.slice(0, 50); // Use a larger sample for answering questions
        const result = await askQuestion({ question, columnHeaders: headers, dataSample });
        if (result && result.answer) {
            setAnswer(result.answer);
        } else {
            throw new Error("No answer returned from AI.");
        }
    } catch (error) {
        console.error("AI question error:", error);
        toast({ variant: "destructive", title: "AI Error", description: "Could not get an answer." });
    } finally {
        setLoadingAnswer(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 md:p-8">
      <div ref={dashboardRef} className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <File className="mr-2 h-4 w-4" /> Upload Data
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                />
                <Button onClick={handleExportPDF} disabled={data.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export PDF
                </Button>
            </div>
        </div>

        {data.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Key Metrics</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-2">
                            <Rows className="h-5 w-5 text-primary"/>
                            <p>{data.length} Rows</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Columns className="h-5 w-5 text-primary"/>
                            <p>{headers.length} Columns</p>
                        </div>
                    </CardContent>
                </Card>
                 <Card className="md:col-span-1 lg:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Chart Suggestions</CardTitle>
                        <Button variant="ghost" size="sm" onClick={handleGetAiSuggestions} disabled={loadingSuggestions || data.length === 0}>
                            {loadingSuggestions ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            ) : (
                                <BrainCircuit className="mr-2 h-4 w-4" />
                            )}
                            Get Suggestions
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-2">
                        {loadingSuggestions && <p className="text-muted-foreground">Generating ideas...</p>}
                        {aiSuggestions.length > 0 && (
                            <Alert>
                                <AlertTitle className="font-semibold">Here are some ideas!</AlertTitle>
                                <AlertDescription>
                                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                                        {aiSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}
                        {!loadingSuggestions && aiSuggestions.length === 0 && <p className="text-muted-foreground text-sm">Click the button to get AI-powered chart suggestions.</p>}
                    </CardContent>
                </Card>
            </div>

            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline">
                      <MessageCircleQuestion className="h-6 w-6" />
                      Ask a question about your data
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid gap-2">
                      <Label htmlFor="ai-question">Your Question</Label>
                      <Textarea 
                          id="ai-question"
                          placeholder="e.g., What is the total sales amount?"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          disabled={loadingAnswer}
                      />
                  </div>
                  <Button onClick={handleAskQuestion} disabled={loadingAnswer || !question}>
                      {loadingAnswer ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Get Answer
                  </Button>
                  {loadingAnswer && <p className="text-muted-foreground">Thinking...</p>}
                  {answer && (
                      <Alert>
                          <AlertTitle className="font-semibold">Answer</AlertTitle>
                          <AlertDescription className="prose prose-sm dark:prose-invert max-w-none">
                              <p>{answer}</p>
                          </AlertDescription>
                      </Alert>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="font-headline">Chart Visualizations</CardTitle>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="layout-cols">Layout</Label>
                        <Select value={String(layoutCols)} onValueChange={(v) => setLayoutCols(Number(v))}>
                            <SelectTrigger id="layout-cols" className="w-24">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 Column</SelectItem>
                                <SelectItem value="2">2 Columns</SelectItem>
                                <SelectItem value="3">3 Columns</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleAddChart}><Plus className="mr-2 h-4 w-4" /> Add Chart</Button>
                </div>
              </CardHeader>
              <CardContent>
                {chartConfigs.length > 0 ? (
                    <div className={cn("grid gap-6", {
                        "grid-cols-1": layoutCols === 1,
                        "grid-cols-1 md:grid-cols-2": layoutCols === 2,
                        "grid-cols-1 md:grid-cols-2 xl:grid-cols-3": layoutCols === 3,
                    })}>
                        {chartConfigs.map((config) => (
                            <div key={config.id} className="flex flex-col gap-4">
                                <ChartControls config={config} data={data} onUpdate={handleUpdateChart} onRemove={handleRemoveChart} />
                                <ChartView config={config} data={data} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-48 flex-col items-center justify-center rounded-md border-2 border-dashed">
                        <p className="text-muted-foreground">No charts yet.</p>
                        <Button variant="link" onClick={handleAddChart}>Add your first chart</Button>
                    </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Raw Data Preview (First 20 Rows)</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable data={data} headers={headers} />
              </CardContent>
            </Card>
          </>
        )}

        {data.length === 0 && (
            <div className="flex h-[60vh] flex-col items-center justify-center rounded-md border-2 border-dashed text-center">
                <File className="h-16 w-16 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold font-headline">Upload Your Data</h2>
                <p className="mt-1 text-muted-foreground">
                    Upload a .csv, .xls, or .xlsx file to get started.
                </p>
                 <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>
                    <File className="mr-2 h-4 w-4" /> Select File
                </Button>
            </div>
        )}
      </div>
    </main>
  );
}
