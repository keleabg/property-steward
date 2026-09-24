import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Square, Settings, Globe, Loader2, CheckCircle, AlertTriangle, Clock, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startCrawl, getCrawlBatches, addLog } from "@/services/crawlerEngine";
import type { CrawlBatch } from "@/types/property";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export function CrawlerConsole() {
  const [targetUrl, setTargetUrl] = useState("https://yulonahomes.co.ke/properties");
  const [depth, setDepth] = useState(3);
  const [batchSize, setBatchSize] = useState(50);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const activeBatchRef = useRef<CrawlBatch | null>(null);

  const batches = getCrawlBatches();
  const activeBatch = batches.find(b => b.status === "running" || b.status === "paused") || null;

  const addLogLine = (msg: string) => setLogs(prev => [...prev.slice(-200), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleStart = async () => {
    if (isRunning) return;
    setIsRunning(true);
    addLogLine(`Starting crawl of ${targetUrl} (depth: ${depth}, batch: ${batchSize})`);
    try {
      const batch = await startCrawl(targetUrl, depth, batchSize);
      activeBatchRef.current = batch;
      addLogLine(`Crawl complete: ${batch.imported} imported, ${batch.failed} skipped`);
    } catch {
      addLogLine("Crawl failed");
    }
    setIsRunning(false);
  };

  const handlePause = () => {
    if (!activeBatch) return;
    // In simulation mode, we just note it
    addLogLine("Crawl paused");
  };

  const handleStop = () => {
    if (!activeBatch) return;
    addLogLine("Crawl stopped by user");
  };

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      <motion.div variants={container} initial="hidden" animate="show">
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              Crawler Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Target URL</Label>
                <Input
                  value={targetUrl}
                  onChange={e => setTargetUrl(e.target.value)}
                  placeholder="https://yulonahomes.co.ke/properties"
                  className="font-mono text-sm"
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Crawl Depth</Label>
                <Select value={String(depth)} onValueChange={v => setDepth(Number(v))} disabled={isRunning}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} level{n > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Batch Size</Label>
                <Select value={String(batchSize)} onValueChange={v => setBatchSize(Number(v))} disabled={isRunning}>
                  <SelectContent>
                    {[25, 50, 75, 100].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} records</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Button onClick={handleStart} disabled={isRunning} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Start Crawl
              </Button>
              <Button variant="outline" size="sm" onClick={handlePause} disabled={!activeBatch || isRunning}>
                <Pause className="w-4 h-4 mr-2" /> Pause
              </Button>
              <Button variant="outline" size="sm" onClick={handleStop} disabled={!activeBatch || isRunning}>
                <Square className="w-4 h-4 mr-2" /> Stop
              </Button>
              {isRunning && <Badge variant="secondary" className="animate-pulse">Crawling...</Badge>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Batch Progress */}
      {activeBatch && (
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  Active Batch #{activeBatch.currentBatch}/{activeBatch.totalBatches}
                </span>
                <Badge variant={activeBatch.status === "running" ? "default" : "secondary"} className="bg-emerald-600">
                  {activeBatch.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={activeBatch.progressPercent} className="h-2" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Total Found</span>
                  <p className="font-bold text-lg">{activeBatch.totalFound.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Imported</span>
                  <p className="font-bold text-lg text-emerald-600">{activeBatch.imported.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Failed</span>
                  <p className="font-bold text-lg text-red-500">{activeBatch.failed.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Remaining</span>
                  <p className="font-bold text-lg">{activeBatch.remaining.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">ETA</span>
                  <p className="font-bold text-lg">{activeBatch.etaSeconds}s</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Image Download Queue */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-500" />
              Image Download Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> Ready</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-yellow-500" /> Queued</span>
              <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500" /> Failed</span>
              <Separator orientation="vertical" className="h-4" />
              <span>No active downloads</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Live Console Log */}
      <motion.div variants={container} initial="hidden" animate="show">
        <Card className="border-border/60 bg-zinc-950 text-zinc-100">
          <CardHeader className="pb-2 border-b border-zinc-800">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Settings className="w-4 h-4" />
              LIVE TELEMETRY CONSOLE
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64 overflow-y-auto p-4 font-mono text-xs space-y-0.5 scrollbar-thin">
              {logs.length === 0 && (
                <p className="text-zinc-500 italic">Waiting for crawl activity...</p>
              )}
              {logs.map((log, i) => (
                <motion.div key={i} variants={item} className={`${
                  log.includes("failed") || log.includes("error") ? "text-red-400" :
                  log.includes("skipped") || log.includes("duplicate") ? "text-yellow-400" :
                  log.includes("complete") ? "text-emerald-400" :
                  "text-zinc-300"
                }`}>
                  {"  "}
                  {log.startsWith("[") ? log.split("]").join("]") : log}
                </motion.div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}