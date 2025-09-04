
"use client";

import { useState, useRef, createRef, RefObject, useMemo } from "react";
import * as xlsx from "xlsx";
import { BarChart, File, Columns, Rows, Plus, BrainCircuit, Download, Loader2, MessageCircleQuestion, Sparkles, Pencil, FilterX } from "lucide-react";
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
import { ExportDialog, ExportOptions } from "./export-dialog";
import { PaymentDialog } from "./payment-dialog";
import { SuccessDialog } from "./success-dialog";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

type Filter = {
  key: string;
  value: string | number;
} | null;

export default function DashboardPage() {
  const [data, setData] = useState<DataRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);
  const [layoutCols, setLayoutCols] = useState(2);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [comments, setComments] = useState("");
  const [startRow, setStartRow] = useState(0);
  const [numRows, setNumRows] = useState(20);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chartRefs = useRef<RefObject<HTMLDivElement>[]>([]);
  const dataPreviewRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>(null);
  const { user, isSubscribed } = useAuth();
  const router = useRouter();


  const filteredData = useMemo(() => {
    if (!activeFilter) {
      return data;
    }
    return data.filter(row => String(row[activeFilter.key]) === String(activeFilter.value));
  }, [data, activeFilter]);
  
  const displayedData = useMemo(() => {
      return filteredData.slice(startRow, startRow + numRows);
  }, [filteredData, startRow, numRows]);
  
  const handleSetFilter = (key: string, value: string | number) => {
    setActiveFilter({ key, value });
  };
  
  const handleClearFilter = () => {
      setActiveFilter(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast({ title: "Processing File...", description: "Reading and analyzing your data to create a dashboard." });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileData = e.target?.result;
        const workbook = xlsx.read(fileData, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Use sheet_to_json with raw: false to get formatted strings for dates
        const jsonDataRaw = xlsx.utils.sheet_to_json<DataRow>(worksheet, { raw: false, defval: "" });

        if (jsonDataRaw.length > 0) {
          const newHeaders = Object.keys(jsonDataRaw[0]);

          // Ensure all data is serializable (convert everything to string)
          const jsonData = jsonDataRaw.map(row => {
            const newRow: DataRow = {};
            for(const key in row) {
                newRow[key] = String(row[key]);
            }
            return newRow;
          });

          setData(jsonData);
          setHeaders(newHeaders);
          setQuestion("");
          setAnswer("");
          setActiveFilter(null);
          setStartRow(0);
          setNumRows(Math.min(20, jsonData.length));

          // Generate charts with AI
          const dataSample = jsonData.slice(0, 5);
          const result = await suggestCharts({ columnHeaders: newHeaders, dataSample });

          if (result && result.suggestions) {
            setChartConfigs(result.suggestions);
            toast({ title: "Dashboard Ready!", description: "Your initial dashboard has been generated." });
          } else {
             throw new Error("AI could not generate chart configurations.");
          }
        } else {
            throw new Error("No data found in file.");
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to parse the file or generate charts. Please check the file format.",
        });
      } finally {
          setIsUploading(false);
      }
    };
    reader.onerror = () => {
        setIsUploading(false);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to read the file.",
        });
    }
    reader.readAsBinaryString(file);
  };
  
  const handleExportClick = () => {
    if (!user) {
        toast({
            title: "Login Required",
            description: "Please log in to export your dashboard.",
            variant: "destructive",
        });
        router.push('/login');
        return;
    }
    if (!isSubscribed) {
        setIsPaymentDialogOpen(true);
        return;
    }
    setIsExportDialogOpen(true);
  }
  
  const handlePaymentSuccess = (type: 'onetime' | 'subscription') => {
      setIsPaymentDialogOpen(false);
      setIsSuccessDialogOpen(true);
  }


  const handleExportPDF = async (options: ExportOptions) => {
    toast({ title: "Exporting PDF...", description: "Please wait while we generate your PDF." });

    try {
        const { default: jsPDF } = await import("jspdf");
        const { default: html2canvas } = await import("html2canvas");

        const pdf = new jsPDF({
            orientation: options.orientation,
            unit: 'px',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const chartElements = chartRefs.current.map(ref => ref.current).filter(el => el !== null) as HTMLElement[];

        for(let i = 0; i < chartElements.length; i++) {
            const chartElement = chartElements[i];
            const canvas = await html2canvas(chartElement, { scale: 2, backgroundColor: "#0F172A", useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const aspectRatio = imgWidth / imgHeight;

            if (options.chartsPerPage === 1) {
                if (i > 0) pdf.addPage();
                let finalWidth = pdfWidth * 0.8;
                let finalHeight = finalWidth / aspectRatio;
                if(finalHeight > pdfHeight * 0.8) {
                    finalHeight = pdfHeight * 0.8;
                    finalWidth = finalHeight * aspectRatio;
                }
                const x = (pdfWidth - finalWidth) / 2;
                const y = (pdfHeight - finalHeight) / 2;
                pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
            } else { // 2 charts per page
                 if (i % 2 === 0 && i > 0) {
                     pdf.addPage();
                 }

                 if (options.orientation === 'landscape') {
                     // side-by-side
                     let finalWidth = pdfWidth * 0.45;
                     let finalHeight = finalWidth / aspectRatio;
                      if(finalHeight > pdfHeight * 0.8) {
                        finalHeight = pdfHeight * 0.8;
                        finalWidth = finalHeight * aspectRatio;
                    }
                    const x = i % 2 === 0 ? (pdfWidth / 2 - finalWidth) / 2 : pdfWidth / 2 + (pdfWidth / 2 - finalWidth) / 2;
                    const y = (pdfHeight - finalHeight) / 2;
                    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
                 } else { // portrait, top and bottom
                     let finalWidth = pdfWidth * 0.8;
                     let finalHeight = finalWidth / aspectRatio;
                      if(finalHeight > pdfHeight * 0.4) {
                        finalHeight = pdfHeight * 0.4;
                        finalWidth = finalHeight * aspectRatio;
                    }
                    const x = (pdfWidth - finalWidth) / 2;
                    const y = i % 2 === 0 ? (pdfHeight / 2 - finalHeight) / 2 : pdfHeight / 2 + (pdfHeight / 2 - finalHeight) / 2;
                     pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
                 }
            }
        }
        
        if (dataPreviewRef.current) {
            pdf.addPage();
            const canvas = await html2canvas(dataPreviewRef.current, { scale: 2, backgroundColor: "#0F172A", useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const aspectRatio = imgWidth / imgHeight;
            
            let finalWidth = pdfWidth * 0.9;
            let finalHeight = finalWidth / aspectRatio;
             if(finalHeight > pdfHeight * 0.9) {
                finalHeight = pdfHeight * 0.9;
                finalWidth = finalHeight * aspectRatio;
            }
            const x = (pdfWidth - finalWidth) / 2;
            const y = (pdfHeight - finalHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
        }

        pdf.save(`datasight-dashboard-${new Date().toISOString()}.pdf`);
    } catch(error) {
        console.error("Failed to export PDF", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to export dashboard as PDF." });
    }
  };

  const handleAddChart = () => {
    const newChart: ChartConfig = {
      id: `chart-${Date.now()}-${Math.random()}`,
      type: "bar",
      xAxis: headers[0] || "",
      yAxis: headers[1] ? [headers[1]] : (headers[0] ? [headers[0]] : []),
      stackBy: headers.length > 2 ? headers[2] : undefined,
      value: headers.length > 2 ? headers[2] : (headers.length > 1 ? headers[1] : (headers[0] || "")),
      aggregation: 'sum',
      prefix: '',
      suffix: '',
      notes: '',
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
  
  const handleStartRowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setStartRow(Math.max(0, Math.min(filteredData.length - 1, value)));
    }
  }

  const handleNumRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setNumRows(Math.max(1, Math.min(filteredData.length, value)));
    }
  }
  
  chartRefs.current = chartConfigs.map((_, i) => chartRefs.current[i] ?? createRef<HTMLDivElement>());


  return (
    <>
      <main className="p-4 sm:p-6 md:p-8">
        <ExportDialog 
          isOpen={isExportDialogOpen} 
          onClose={() => setIsExportDialogOpen(false)} 
          onExport={handleExportPDF}
        />
        <PaymentDialog 
          isOpen={isPaymentDialogOpen} 
          onClose={() => setIsPaymentDialogOpen(false)} 
          onSuccess={handlePaymentSuccess}
        />
        <SuccessDialog
          isOpen={isSuccessDialogOpen}
          onClose={() => {
              setIsSuccessDialogOpen(false);
              setIsExportDialogOpen(true);
          }}
        />
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
              <p className="text-muted-foreground">Design and build a great dashboard.</p>
            </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <File className="mr-2 h-4 w-4" />}
                      {data.length > 0 ? 'Upload New Data' : 'Upload Data'}
                  </Button>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    disabled={isUploading}
                  />
                  <Button onClick={handleExportClick} disabled={chartConfigs.length === 0}>
                      <Download className="mr-2 h-4 w-4" /> Export PDF
                  </Button>
              </div>
          </div>
          
          {data.length === 0 && (
            <Card className="w-full">
              <CardContent className="p-6 flex flex-col items-center text-center">
                  <Image 
                      src="/dashboard.png" 
                      alt="Sample Dashboard pic"
                      data-ai-hint="dashboard professional"
                      width={1200}
                      height={600}
                      className="w-full max-w-4xl rounded-lg border shadow-md mb-4"
                  />
                  <h2 className="text-2xl font-headline mt-4">Powerful Dashboards Made Easy</h2>
                  <p className="text-muted-foreground max-w-2xl">
                      Turn your data into beautiful, interactive dashboards. Upload a file to see the magic happen. Our AI will automatically generate insightful charts and key metrics for you.
                  </p>
              </CardContent>
            </Card>
          )}

          {data.length > 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Key Metrics</CardTitle>
                          <BarChart className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-4 pt-2">
                          <div className="flex items-center gap-2">
                              <Rows className="h-5 w-5 text-primary"/>
                              <p>{filteredData.length} Rows</p>
                          </div>
                          <div className="flex items-center gap-2">
                              <Columns className="h-5 w-5 text-primary"/>
                              <p>{headers.length} Columns</p>
                          </div>
                      </CardContent>
                  </Card>
              </div>
              
              {activeFilter && (
                  <Card>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Filtered by:</span>
                          <span className="text-sm text-primary font-semibold">{activeFilter.key} = "{activeFilter.value}"</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleClearFilter}>
                            <FilterX className="mr-2 h-4 w-4" />
                            Clear Filter
                        </Button>
                      </CardContent>
                  </Card>
              )}

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
                  <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                          <Label htmlFor="layout-cols">Layout</Label>
                          <Select value={String(layoutCols)} onValueChange={(v) => setLayoutCols(Number(v))}>
                              <SelectTrigger id="layout-cols" className="w-32">
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
                          {chartConfigs.map((config, index) => {
                              const chartData = (config.type === 'kpi' || config.type === 'histogram' || config.type === 'roi') ? filteredData : displayedData;
                              return (
                                  <div key={config.id} className="flex flex-col gap-4">
                                      <div ref={chartRefs.current[index]}>
                                          <ChartView config={config} data={chartData} onDataPointClick={handleSetFilter} />
                                      </div>
                                      <ChartControls config={config} data={chartData} onUpdate={handleUpdateChart} onRemove={handleRemoveChart} />
                                  </div>
                              );
                          })}
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
                    <CardTitle className="flex items-center gap-2 font-headline">
                        <Pencil className="h-6 w-6" />
                        Comments & Reviews
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea 
                        placeholder="Add your notes, comments, or reviews here..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={6}
                    />
                </CardContent>
              </Card>
            </>
          )}
          
          <div ref={dataPreviewRef}>
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Data Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="grid gap-2">
                        <Label htmlFor="start-row">Start Row</Label>
                        <Input id="start-row" type="number" value={startRow} onChange={handleStartRowChange} min={0} max={filteredData.length - 1} className="w-32" disabled={data.length === 0}/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="num-rows">Number of Rows</Label>
                        <Input id="num-rows" type="number" value={numRows} onChange={handleNumRowsChange} min={1} max={filteredData.length} className="w-32" disabled={data.length === 0}/>
                    </div>
                </div>
                <DataTable data={displayedData} headers={headers} className="overflow-x-auto"/>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </>
  );
}
