"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, AlertTriangle, CheckCircle2, FileImage, FileVideo, X } from "lucide-react";

interface Behavior {
  type: string;
  description: string;
  confidence: number;
}

interface AnalyzeResult {
  behaviors: Behavior[];
  behaviors_count: number;
  result_image?: string | null;
  result_video?: string | null;
  suspicious_frames?: number[];
  type: string;
}

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "video">("image");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleFile = (f: File) => {
    setError(null);
    setResult(null);
    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Unsupported file type. Please upload an image or video.");
      return;
    }
    setFile(f);
    setFileType(isImage ? "image" : "video");
    setFilePreview(URL.createObjectURL(f));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint = fileType === "image" ? "/api/analyze/image" : "/api/analyze/video";
      const resp = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || `Server error ${resp.status}`);
      }
      const data = await resp.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFilePreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const maxConfidence = result?.behaviors?.length
    ? Math.max(...result.behaviors.map((b) => b.confidence))
    : 0;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Behavior Analysis</h2>
        <p className="text-foreground/60">
          Upload an image or video to run the 21-type behavior detection engine (MediaPipe + XGBoost + rule fusion).
        </p>
      </header>

      {/* Upload area */}
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`glass-panel p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center min-h-[320px] ${
            dragOver ? "border-brand bg-brand/5 scale-[1.01]" : "border-glass-border hover:border-brand/50"
          }`}
        >
          <Upload className="w-12 h-12 text-foreground/40 mb-4" />
          <p className="text-lg font-medium mb-1">Drop file here or click to upload</p>
          <p className="text-sm text-foreground/50">Supports JPG / PNG / MP4 / AVI / MOV</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}

      {/* Selected file preview + actions */}
      {file && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: preview */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-glass-border">
              <div className="flex items-center gap-2 text-sm">
                {fileType === "image" ? <FileImage className="w-4 h-4 text-brand" /> : <FileVideo className="w-4 h-4 text-brand" />}
                <span className="font-mono truncate max-w-[280px]">{file.name}</span>
              </div>
              <button onClick={reset} className="p-1.5 rounded hover:bg-white/10 text-foreground/60 hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-black/40 flex items-center justify-center min-h-[300px]">
              {fileType === "image" ? (
                <img src={filePreview || ""} alt="preview" className="max-h-[400px] object-contain" />
              ) : (
                <video src={filePreview || ""} controls className="max-h-[400px] w-full object-contain" />
              )}
            </div>
          </div>

          {/* Right: actions + stats */}
          <div className="flex flex-col gap-4">
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Analysis</h3>
              <button
                onClick={analyze}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand/20 border border-brand/35 hover:bg-brand/30 text-brand rounded-lg transition-colors font-bold disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing... (may take 10-60s)
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Run 21-Behavior Detection
                  </>
                )}
              </button>
              {error && (
                <div className="mt-4 flex items-start gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {result && (
              <div className="glass-panel rounded-2xl p-6 flex-1">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-black/30 rounded-lg border border-glass-border">
                    <div className="text-xs text-foreground/50 uppercase tracking-wider mb-1">Behaviors</div>
                    <div className="text-2xl font-bold text-brand">{result.behaviors_count}</div>
                  </div>
                  <div className="p-3 bg-black/30 rounded-lg border border-glass-border">
                    <div className="text-xs text-foreground/50 uppercase tracking-wider mb-1">Max Confidence</div>
                    <div className={`text-2xl font-bold ${maxConfidence >= 0.7 ? "text-danger" : maxConfidence >= 0.5 ? "text-orange-400" : "text-green-400"}`}>
                      {(maxConfidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                {result.behaviors_count === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    No suspicious behaviors detected.
                  </div>
                ) : (
                  <div className="text-sm text-foreground/60">
                    {result.suspicious_frames ? `${result.suspicious_frames.length} suspicious frames` : "See details below"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result media */}
      {result && (result.result_image || result.result_video) && (
        <div className="glass-panel rounded-2xl overflow-hidden mt-6">
          <div className="p-4 border-b border-glass-border">
            <h3 className="font-bold">Annotated Result</h3>
          </div>
          <div className="p-4 bg-black/40 flex items-center justify-center">
            {result.type === "image" && result.result_image && (
              <img src={`data:image/jpeg;base64,${result.result_image}`} alt="result" className="max-h-[600px] object-contain" />
            )}
            {result.type === "video" && result.result_video && (
              <video controls className="max-h-[600px] w-full object-contain">
                <source src={`data:video/mp4;base64,${result.result_video}`} type="video/mp4" />
              </video>
            )}
          </div>
        </div>
      )}

      {/* Behavior list */}
      {result && result.behaviors.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden mt-6">
          <div className="p-4 border-b border-glass-border">
            <h3 className="font-bold">Detected Behaviors ({result.behaviors.length})</h3>
          </div>
          <div className="divide-y divide-glass-border/50">
            {result.behaviors.map((b, i) => {
              const level = b.confidence >= 0.7 ? "high" : b.confidence >= 0.5 ? "mid" : "low";
              const color = level === "high" ? "bg-danger" : level === "mid" ? "bg-orange-400" : "bg-green-400";
              return (
                <div key={i} className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{b.type}</div>
                    {b.description && b.description !== b.type && (
                      <div className="text-xs text-foreground/60 mt-1">{b.description}</div>
                    )}
                    {"frame" in b && "time" in b && (
                      <div className="text-xs text-foreground/40 mt-1 font-mono">
                        frame {(b as any).frame} @ {(b as any).time.toFixed(2)}s
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 w-48">
                    <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${b.confidence * 100}%` }} />
                    </div>
                    <span className={`text-sm font-bold ${level === "high" ? "text-danger" : level === "mid" ? "text-orange-400" : "text-green-400"}`}>
                      {(b.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
