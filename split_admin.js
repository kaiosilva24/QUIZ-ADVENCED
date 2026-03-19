const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend', 'src', 'App.jsx');
const content = fs.readFileSync(file, 'utf8');

const splitStr = "// ─── AdminApp: gerencia auth antes de exibir o painel";
const splitIdx = content.indexOf(splitStr);

if (splitIdx === -1) {
  console.log("Could not find split string");
  process.exit(1);
}

const part1 = content.slice(0, splitIdx);
const part2 = content.slice(splitIdx);

let newApp = part1.replace(/import \{[\s\S]*?\} from 'lucide-react';/, '');
newApp = newApp.replace(/import QuizBuilder from '\.\/QuizBuilder';/, '');
newApp = newApp.replace(/return <AdminApp \/>;/, `return (
    <React.Suspense fallback={<div style={{minHeight:'100vh',background:'#020617',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontFamily:'sans-serif'}}>Carregando painel...</div>}>
      <AdminApp />
    </React.Suspense>
  );`);
newApp += "\nconst AdminApp = React.lazy(() => import('./Admin'));\n";

const adminContent = `import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, Edit3, Trash2, ArrowRight, X, ChevronLeft, ChevronDown, Save, GripVertical, Settings2, Home, Palette, 
  MessageCircle, BarChart2, MousePointerClick, CheckSquare, AlignLeft, ImageIcon, CheckCircle, 
  Users, TrendingUp, Shuffle, ToggleLeft, ToggleRight, LayoutTemplate, Layers, Eye, EyeOff, Plus, PlayCircle, 
  Video as VideoIcon, Volume2, Copy, ListTodo, Settings, CheckCircle2, Zap, LogOut, UserPlus, Lock, User
} from 'lucide-react';
import QuizBuilder from './QuizBuilder';

const logoSrc = '/logo3.svg';
const API = '/api';

export default function AdminModule() {
  return <AdminApp />;
}

${part2}
`;

fs.writeFileSync(file, newApp);
fs.writeFileSync(path.join(__dirname, 'frontend', 'src', 'Admin.jsx'), adminContent);
console.log("Split successful");
