/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Code2, 
  Loader2, 
  Info, 
  Terminal,
  FileCode,
  Sparkles,
  MousePointer2,
  Bookmark,
  User,
  Settings,
  Circle,
  FileJson,
  FolderOpen,
  GitBranch,
  Search,
  MessageSquare,
  Cpu,
  Layers,
  ChevronRight,
  Plus,
  Trash2,
  Share2
} from "lucide-react";
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MODEL_NAME = "gemini-3-flash-preview"; 

interface VirtualFile {
  id: string;
  name: string;
  language: string;
  content: string;
}

interface LineExplanation {
  line: number;
  text: string;
  complexity: 'low' | 'high'; // low level vs high level
  relationTo?: string; // ID of another file this relates to
}

interface ProjectAnalysis {
  fileExplanations: { [fileId: string]: LineExplanation[] };
  topology: { 
    source: string; 
    target: string; 
    description: string; 
  }[];
  architectureSummary: string;
}

const DEFAULT_FILES: VirtualFile[] = [
  {
    id: '1',
    name: 'App.tsx',
    language: 'typescript',
    content: `import { UserProfile } from './types';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user } = useAuth();
  
  return (
    <div>
      <h1>Welcome {user.name}</h1>
      <UserProfile data={user} />
    </div>
  );
}`
  },
  {
    id: '2',
    name: 'types.ts',
    language: 'typescript',
    content: `export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserProfileProps {
  data: User;
}`
  }
];

export default function App() {
  const [files, setFiles] = useState<VirtualFile[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = useState<string>(DEFAULT_FILES[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<'walkthrough' | 'topology' | 'concepts'>('walkthrough');

  const activeFile = useMemo(() => files.find(f => f.id === activeFileId) || files[0], [files, activeFileId]);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  const addNewFile = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newFile: VirtualFile = {
      id: newId,
      name: `new-file-${files.length + 1}.ts`,
      language: 'typescript',
      content: ''
    };
    setFiles([...files, newFile]);
    setActiveFileId(newId);
  };

  const removeFile = (id: string) => {
    if (files.length <= 1) return;
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    if (activeFileId === id) setActiveFileId(newFiles[0].id);
  };

  const updateActiveFileContent = (content: string) => {
    setFiles(files.map(f => f.id === activeFileId ? { ...f, content } : f));
  };

  const updateActiveFileName = (name: string) => {
    setFiles(files.map(f => f.id === activeFileId ? { ...f, name } : f));
  };

  const analyzeProject = async () => {
    setIsLoading(true);
    setError(null);

    const projectContext = files.map(f => `FILE: ${f.name}\nCONTENT:\n${f.content}`).join('\n\n---\n\n');

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `You are an expert software architect teaching a fresher. 
        Analyze this codebase project. Explain how files connect and what each line does in simple "ELI5" terms.
        
        ${projectContext}
        
        Focus on:
        1. How files import each other (Topology).
        2. Line-by-line breakdown for the active file: ${activeFile.name}.
        3. Explaining low-level mechanics (how the code actually runs).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fileExplanations: {
                type: Type.OBJECT,
                additionalProperties: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      line: { type: Type.INTEGER },
                      text: { type: Type.STRING },
                      complexity: { type: Type.STRING, enum: ['low', 'high'] },
                      relationTo: { type: Type.STRING, description: "Optional name of related file" }
                    },
                    required: ["line", "text"]
                  }
                }
              },
              topology: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING },
                    target: { type: Type.STRING },
                    description: { type: Type.STRING, description: "How they are linked (e.g. imports type from)" }
                  }
                }
              },
              architectureSummary: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      setAnalysis(result);
      setActiveMode('walkthrough');
    } catch (err: any) {
      console.error("AI Error:", err);
      setError("Analysis protocol interrupted. Please verify your codebase structure.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#0A0A0A] text-[#D4D4D4] font-sans selection:bg-[#D4AF37] selection:text-black flex overflow-hidden">
      {/* Sidebar - Primary Actions */}
      <aside className="w-12 bg-[#0D0D0D] border-r border-[#1F1F1F] flex flex-col items-center py-6 gap-6 shrink-0">
        <div className="w-8 h-8 rounded bg-[#1F1F1F] flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
          <FolderOpen className="w-4 h-4 text-[#D4AF37]" />
        </div>
        <div className="w-8 h-8 rounded bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] shadow-lg shadow-[#D4AF37]/5">
          <GitBranch className="w-4 h-4" />
        </div>
        <div className="w-8 h-8 rounded bg-[#1F1F1F] flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
          <Search className="w-4 h-4" />
        </div>
        <div className="w-8 h-8 rounded bg-[#1F1F1F] flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="mt-auto w-8 h-8 rounded bg-[#1F1F1F] flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
          <Settings className="w-4 h-4" />
        </div>
      </aside>

      {/* Explorer Sidebar */}
      <nav className="w-64 bg-[#0D0D0D] border-r border-[#1F1F1F] flex flex-col shrink-0 hidden md:flex">
        <div className="p-6 border-b border-[#1F1F1F] flex items-center justify-between">
          <h1 className="font-serif italic text-xl tracking-wide text-[#F2F2F2]">Exegesis AI</h1>
          <button onClick={addNewFile} className="hover:text-[#D4AF37] transition-colors"><Plus className="w-4 h-4" /></button>
        </div>
        
        <div className="flex-1 py-4 overflow-y-auto">
          <div className="px-6 py-2 text-[10px] uppercase tracking-[0.2em] text-[#555] font-bold mb-2">Project Explorer</div>
          <div className="space-y-0.5">
            {files.map(file => (
              <div 
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={cn(
                  "px-6 py-2 flex items-center justify-between group cursor-pointer border-r-2 text-sm transition-all",
                  activeFileId === file.id 
                    ? "bg-white/5 text-[#D4AF37] border-[#D4AF37]" 
                    : "text-[#555] border-transparent hover:bg-white/2"
                )}
              >
                <div className="flex items-center gap-3">
                  <FileCode className={cn("w-3 h-3", activeFileId === file.id ? "text-[#D4AF37]" : "text-[#333]")} />
                  <span className="truncate">{file.name}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[#1F1F1F] bg-[#0F0F0F]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8A6D1D] shadow-lg shadow-[#D4AF37]/10" />
            <div className="text-xs">
              <div className="font-medium text-[#D4D4D4]">Fresher Dev</div>
              <div className="text-[#555] font-mono text-[9px] uppercase">Intelligence On</div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor Toolbar */}
        <header className="h-12 border-b border-[#1F1F1F] flex items-center justify-between px-6 bg-[#0A0A0A]">
          <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-[#555]">
            <span className="hover:text-[#D4AF37] transition-colors cursor-pointer">~/src/project/</span>
            <input 
              value={activeFile.name} 
              onChange={(e) => updateActiveFileName(e.target.value)}
              className="bg-transparent border-none outline-none text-[#D4AF37] w-32 focus:bg-white/5 px-1 rounded transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={analyzeProject}
              disabled={isLoading || !activeFile.content.trim()}
              className="px-4 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[9px] font-bold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-black transition-all flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
              {isLoading ? "Analyzing Hierarchy" : "Deep Scan Codebase"}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex">
          {/* Main Editor Surface */}
          <section className="flex-1 flex flex-col bg-[#0A0A0A] overflow-hidden relative">
            <div className="flex-1 flex overflow-hidden">
              <div className="w-10 bg-[#0D0D0D] border-r border-[#1F1F1F] flex flex-col pt-6 font-mono text-[9px] text-[#333] text-right pr-3 select-none">
                {activeFile.content.split('\n').map((_, i) => (
                  <div key={i} className="h-6 leading-relaxed">{i + 1}</div>
                ))}
              </div>
              <textarea
                value={activeFile.content}
                onChange={(e) => updateActiveFileContent(e.target.value)}
                spellCheck={false}
                className="flex-1 bg-transparent p-6 font-mono text-sm leading-6 outline-none resize-none placeholder:text-[#222120] text-[#D4D4D4] h-full"
                placeholder="// Type or paste code to see the magic..."
              />
            </div>
            
            {error && (
              <div className="absolute bottom-6 inset-x-6">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center gap-3 backdrop-blur-md"
                >
                  <Info className="w-4 h-4 text-red-500" />
                  <p className="text-[11px] font-serif italic text-red-100/50 uppercase tracking-widest">{error}</p>
                </motion.div>
              </div>
            )}
          </section>

          {/* Intelligence Sidebar */}
          <section className="w-[420px] bg-[#0E0E0E] flex flex-col overflow-hidden border-l border-[#1F1F1F]">
            {/* Mode Switcher */}
            <div className="flex border-b border-[#1F1F1F]">
              {(['walkthrough', 'topology', 'concepts'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setActiveMode(mode)}
                  className={cn(
                    "flex-1 py-3 text-[9px] font-bold uppercase tracking-widest transition-all",
                    activeMode === mode ? "text-[#D4AF37] bg-white/5" : "text-[#555] hover:text-[#888]"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-8">
              <div className="mb-8">
                <h2 className="font-serif text-3xl italic mb-3 text-[#F2F2F2]">
                  {activeMode === 'walkthrough' && "Sequence Analysis"}
                  {activeMode === 'topology' && "Codebase Plumbing"}
                  {activeMode === 'concepts' && "Logic Primitives"}
                </h2>
                <div className="h-px w-12 bg-[#D4AF37] mb-4" />
                <p className="text-[10px] text-[#555] font-mono uppercase tracking-[0.1em] leading-relaxed">
                  {isLoading ? "Intercepting execution frames..." : (
                    activeMode === 'walkthrough' ? "A line-by-line breakdown for beginners." : 
                    activeMode === 'topology' ? "How your files interact at a binary level." :
                    "High-level architectural patterns explained simply."
                  )}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {analysis ? (
                    <motion.div
                      key={activeMode}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-8"
                    >
                      {activeMode === 'walkthrough' && (
                        (analysis.fileExplanations[activeFile.name] || []).map((exp, i) => (
                          <div 
                            key={i} 
                            onMouseEnter={() => setHoveredLine(exp.line)}
                            onMouseLeave={() => setHoveredLine(null)}
                            className="relative pl-6 border-l border-white/5 group"
                          >
                            <div className={cn(
                              "absolute -left-[3px] top-0 w-1.5 h-1.5 rounded-full transition-all",
                              hoveredLine === exp.line ? "bg-[#D4AF37] scale-125" : "bg-white/10"
                            )} />
                            <div className={cn(
                              "font-mono text-[9px] uppercase tracking-widest mb-1 transition-colors",
                              hoveredLine === exp.line ? "text-[#D4AF37]" : "text-[#444]"
                            )}>
                              Line {exp.line.toString().padStart(2, '0')} 
                              {exp.relationTo && <span className="ml-2 text-[#555]">— Ref: {exp.relationTo}</span>}
                            </div>
                            <div className="font-serif italic text-sm text-[#888] leading-relaxed group-hover:text-[#AAA] transition-colors">
                              <Markdown>{exp.text}</Markdown>
                            </div>
                            {exp.complexity === 'low' && (
                              <div className="mt-2 flex items-center gap-1.5 opacity-50">
                                <Cpu className="w-3 h-3 text-[#D4AF37]" />
                                <span className="text-[9px] font-mono uppercase text-[#D4AF37]">Machine Logic</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {activeMode === 'topology' && (
                        <div className="space-y-4">
                          {analysis.topology.map((link, i) => (
                            <div key={i} className="p-4 bg-white/2 border border-white/5 rounded-lg flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-[#D4AF37]">{link.source}</span>
                                <ChevronRight className="w-3 h-3 opacity-30" />
                                <span className="text-[10px] font-mono text-[#D4AF37]">{link.target}</span>
                              </div>
                              <p className="text-xs italic text-[#666] leading-relaxed">{link.description}</p>
                            </div>
                          ))}
                          {analysis.topology.length === 0 && (
                            <p className="text-xs text-[#444] italic">No active file relationships detected in buffer.</p>
                          )}
                        </div>
                      )}

                      {activeMode === 'concepts' && (
                        <div className="p-6 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-xl">
                          <div className="flex items-center gap-3 mb-4">
                            <Layers className="w-4 h-4 text-[#D4AF37]" />
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Mental Model</h4>
                          </div>
                          <div className="font-serif italic text-sm text-[#AAA] leading-relaxed">
                            <Markdown>{analysis.architectureSummary}</Markdown>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : !isLoading && (
                    <div className="flex flex-col items-center justify-center h-48 opacity-20 text-center">
                      <Terminal className="w-8 h-8 mb-4" strokeWidth={1} />
                      <p className="font-serif italic text-sm uppercase tracking-widest">Awaiting Semantic Protocol</p>
                    </div>
                  )}

                  {isLoading && (
                    <div className="flex flex-col items-center justify-center h-48 gap-6">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full border border-white/5 animate-ping absolute inset-0" />
                        <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" strokeWidth={1} />
                      </div>
                      <p className="text-[9px] font-mono text-[#555] animate-pulse tracking-[0.4em] uppercase">Decoding Architecture</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-8 pt-8 border-t border-[#1F1F1F]">
                <button className="w-full py-3 bg-[#D4AF37] text-black font-bold uppercase text-[9px] tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-[#D4AF37]/5 flex items-center justify-center gap-2">
                  <Share2 className="w-3 h-3" />
                  Export Documentation
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="h-8 border-t border-[#1F1F1F] flex items-center justify-between px-6 bg-[#0D0D0D]">
          <div className="flex items-center gap-4 text-[8px] font-mono text-[#333] tracking-[0.2em] uppercase">
            <span>Core: 1.0.4</span>
            <span>Entropy: Stabilizing</span>
          </div>
          <div className="text-[8px] text-[#333] font-mono tracking-[0.2em] uppercase">
            &copy; 2024 Exegesis Core Systems
          </div>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1F1F1F; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D4AF37; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .markdown-body p { margin-bottom: 0.75rem; }
        .markdown-body code { 
          background: rgba(212, 175, 55, 0.1); 
          color: #D4AF37; 
          padding: 0 4px; 
          border-radius: 2px;
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}

