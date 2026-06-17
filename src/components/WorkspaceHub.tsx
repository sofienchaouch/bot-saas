import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  ListTodo, 
  Plus, 
  Check, 
  Trash2, 
  FolderOpen, 
  FileText, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  PlusCircle,
  Sparkles
} from 'lucide-react';
import { 
  listGoogleTasks, 
  createGoogleTask, 
  updateGoogleTaskStatus, 
  deleteGoogleTask, 
  listGmailMessages, 
  sendGmailMessage, 
  listDriveFiles, 
  createGoogleDocument, 
  createGoogleSpreadsheet, 
  appendRowToGoogleSpreadsheet,
  GoogleTask,
  GmailMessage,
  DriveFile 
} from '../googleWorkspace';
import { Tenant } from '../types';

interface WorkspaceHubProps {
  googleToken: string | null;
  userEmail: string | null;
  onLogin: () => void;
  tenant: Tenant;
}

const fallbackGoogleTasks = (tenantName: string): GoogleTask[] => [
  {
    id: "f-1",
    title: `Follow up with leads captured via WhatsApp for ${tenantName}`,
    notes: "Review lead spreadsheet in Drive, coordinate with representatives.",
    status: "needsAction",
    updated: new Date().toISOString()
  },
  {
    id: "f-2",
    title: "Draft personalized follow-up templates for chatbot callbacks",
    notes: "Tone: warm, polite, and under 3-4 neat sentences.",
    status: "needsAction",
    updated: new Date().toISOString()
  },
  {
    id: "f-3",
    title: "Synchronize company main schedule with real-time slot checker",
    notes: "Configure active morning appointments on the dashboard.",
    status: "completed",
    updated: new Date().toISOString()
  }
];

const fallbackGmailMessages = (tenantName: string): GmailMessage[] => [
  {
    id: "g-1",
    threadId: "gt-1",
    snippet: `Hello! I would represent ${tenantName} to request a customizable WhatsApp chatbot integration demo. Please contact us back.`,
    from: "Morgan Vance <morgan@vancegroup.co>",
    subject: "Custom WhatsApp bot solution inquiry",
    date: new Date().toLocaleDateString()
  },
  {
    id: "g-2",
    threadId: "gt-2",
    snippet: "The scheduling system successfully booked my appointment slot for Thursday morning! Thank you.",
    from: "Casey Rivers <casey.rivers@gmail.com>",
    subject: "Appointment confirmation feedback",
    date: new Date().toLocaleDateString()
  }
];

const fallbackDriveFiles = (tenantName: string): DriveFile[] => [
  {
    id: "d-1",
    name: `${tenantName} - Knowledge Grounding Guide.pdf`,
    mimeType: "application/pdf",
    modifiedTime: new Date().toISOString(),
    webViewLink: "#"
  },
  {
    id: "d-2",
    name: `${tenantName} - Customer Leads Export.gsheet`,
    mimeType: "application/vnd.google-apps.spreadsheet",
    modifiedTime: new Date().toISOString(),
    webViewLink: "#"
  }
];

export const WorkspaceHub: React.FC<WorkspaceHubProps> = ({ 
  googleToken, 
  userEmail, 
  onLogin, 
  tenant 
}) => {
  // Sub-tabs in the Hub
  const [currentSubTab, setCurrentSubTab] = useState<'overview' | 'gmail' | 'tasks' | 'drive'>('overview');

  // Loading States
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingGmail, setLoadingGmail] = useState(false);
  const [loadingDrive, setLoadingDrive] = useState(false);

  // States
  const [taskList, setTaskList] = useState<GoogleTask[]>([]);
  const [gmailList, setGmailList] = useState<GmailMessage[]>([]);
  const [driveList, setDriveList] = useState<DriveFile[]>([]);

  // Offline / API Fallback warning states
  const [tasksOfflineMode, setTasksOfflineMode] = useState(false);
  const [gmailOfflineMode, setGmailOfflineMode] = useState(false);
  const [driveOfflineMode, setDriveOfflineMode] = useState(false);

  // Form Inputs
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  
  const [emailTo, setEmailTo] = useState(userEmail || '');
  const [emailSubject, setEmailSubject] = useState(`OmniBot SaaS - Pipeline MVP Update for ${tenant.name}`);
  const [emailBody, setEmailBody] = useState(`Hi Professional,\n\nHere is an update regarding the customer service representative @${tenant.botName}.\nThis tenant operates in ${tenant.industry} with active AI agents.\n\nBest regards,\n${tenant.name} Team`);

  const [newDocTitle, setNewDocTitle] = useState(`${tenant.name} - Operational Report`);
  const [newSheetTitle, setNewSheetTitle] = useState(`${tenant.name} - AI Leads Directory`);

  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [appendValues, setAppendValues] = useState<string[]>(['John Doe', 'john@example.com', 'Interested', new Date().toLocaleDateString()]);

  // Messages / Log
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Auto-fill user email when authenticated
  useEffect(() => {
    if (userEmail && !emailTo) {
      setEmailTo(userEmail);
    }
  }, [userEmail]);

  // Load everything on token change
  useEffect(() => {
    if (googleToken) {
      loadAllWorkspaceData();
    }
  }, [googleToken]);

  const loadAllWorkspaceData = () => {
    fetchTasks();
    fetchGmail();
    fetchDrive();
  };

  const clearMessages = () => {
    setActionSuccess(null);
    setActionError(null);
  };

  // API Call: Tasks
  const fetchTasks = async () => {
    if (!googleToken) return;
    setLoadingTasks(true);
    setTasksOfflineMode(false);
    try {
      const data = await listGoogleTasks(googleToken);
      setTaskList(data);
    } catch (err: any) {
      console.warn('[WORKSPACE HUB] Failed to fetch real Google Tasks (falling back to sandbox tasks):', err);
      setTaskList(fallbackGoogleTasks(tenant.name));
      setTasksOfflineMode(true);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleToken || !newTaskTitle.trim()) return;

    clearMessages();
    
    // If operating in offline fallback sandbox mode
    if (tasksOfflineMode) {
      const mockCreated: GoogleTask = {
        id: `f-${Date.now()}`,
        title: newTaskTitle,
        notes: newTaskNotes,
        status: 'needsAction',
        updated: new Date().toISOString()
      };
      setTaskList(prev => [mockCreated, ...prev]);
      setNewTaskTitle('');
      setNewTaskNotes('');
      setActionSuccess('Task created in local sandbox (Offline mode: real Tasks API calls failed or not yet enabled in GCP console).');
      return;
    }

    try {
      const created = await createGoogleTask(googleToken, newTaskTitle, newTaskNotes);
      setTaskList(prev => [created, ...prev]);
      setNewTaskTitle('');
      setNewTaskNotes('');
      setActionSuccess('Task created successfully in Google Tasks!');
    } catch (err: any) {
      setActionError(`Failed to create task: ${err.message}`);
    }
  };

  const handleToggleTask = async (task: GoogleTask) => {
    if (!googleToken) return;
    
    const nextStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    const msg = nextStatus === 'completed' 
      ? `Would you like to mark "${task.title}" as completed?`
      : `Would you like to mark "${task.title}" as pending?`;

    const confirmed = window.confirm(msg);
    if (!confirmed) return;

    clearMessages();

    if (tasksOfflineMode) {
      setTaskList(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus, updated: new Date().toISOString() } : t));
      setActionSuccess(`Task updated in local sandbox (Offline mode) to: ${nextStatus === 'completed' ? 'Completed' : 'Pending'}`);
      return;
    }

    try {
      const updated = await updateGoogleTaskStatus(googleToken, task.id, nextStatus);
      setTaskList(prev => prev.map(t => t.id === task.id ? updated : t));
      setActionSuccess(`Task updated successfully to: ${nextStatus === 'completed' ? 'Completed' : 'Pending'}`);
    } catch (err: any) {
      setActionError(`Failed to update task: ${err.message}`);
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!googleToken) return;

    const confirmed = window.confirm(`Are you sure you want to delete the task "${title}" permanently? This cannot be undone.`);
    if (!confirmed) return;

    clearMessages();

    if (tasksOfflineMode) {
      setTaskList(prev => prev.filter(t => t.id !== taskId));
      setActionSuccess('Task deleted successfully from local sandbox!');
      return;
    }

    try {
      await deleteGoogleTask(googleToken, taskId);
      setTaskList(prev => prev.filter(t => t.id !== taskId));
      setActionSuccess('Task deleted successfully!');
    } catch (err: any) {
      setActionError(`Failed to delete task: ${err.message}`);
    }
  };

  // API Call: Gmail
  const fetchGmail = async () => {
    if (!googleToken) return;
    setLoadingGmail(true);
    setGmailOfflineMode(false);
    try {
      const msgs = await listGmailMessages(googleToken);
      setGmailList(msgs);
    } catch (err) {
      console.warn('[WORKSPACE HUB] Failed to fetch real Gmail emails (falling back to sandbox messages):', err);
      setGmailList(fallbackGmailMessages(tenant.name));
      setGmailOfflineMode(true);
    } finally {
      setLoadingGmail(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleToken || !emailTo.trim()) return;

    const confirmed = window.confirm(`Confirm: Send email to "${emailTo}"?\nSubject: "${emailSubject}"\n\nThis will send a real email using your linked Gmail account.`);
    if (!confirmed) return;

    clearMessages();
    try {
      await sendGmailMessage(googleToken, emailTo, emailSubject, emailBody);
      setActionSuccess(`Email successfully dispatched via Gmail API! Sent message to ${emailTo}`);
      fetchGmail();
    } catch (err: any) {
      setActionError(`Failed to send email: ${err.message}`);
    }
  };

  // API Call: Drive Files
  const fetchDrive = async () => {
    if (!googleToken) return;
    setLoadingDrive(true);
    setDriveOfflineMode(false);
    try {
      const files = await listDriveFiles(googleToken);
      setDriveList(files);
    } catch (err) {
      console.warn('[WORKSPACE HUB] Failed to load real drive files (falling back to sandbox files):', err);
      setDriveList(fallbackDriveFiles(tenant.name));
      setDriveOfflineMode(true);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleCreateDoc = async () => {
    if (!googleToken || !newDocTitle.trim()) return;

    const confirmed = window.confirm(`Create Google Document "${newDocTitle}" inside your Google Drive space?`);
    if (!confirmed) return;

    clearMessages();
    try {
      const doc = await createGoogleDocument(googleToken, newDocTitle);
      setActionSuccess(`Google Document successfully initialized! File ID: ${doc.documentId}.`);
      setNewDocTitle(`${tenant.name} - Operational Report`);
      fetchDrive();
    } catch (err: any) {
      setActionError(`Failed to create Google Doc: ${err.message}`);
    }
  };

  const handleCreateSheet = async () => {
    if (!googleToken || !newSheetTitle.trim()) return;

    const confirmed = window.confirm(`Create Google Spreadsheet "${newSheetTitle}" inside your Google Drive space?`);
    if (!confirmed) return;

    clearMessages();
    try {
      const sheet = await createGoogleSpreadsheet(googleToken, newSheetTitle);
      setSelectedSheetId(sheet.spreadsheetId);
      setActionSuccess(`Google Spreadsheet created! URL: ${sheet.spreadsheetUrl}`);
      setNewSheetTitle(`${tenant.name} - AI Leads Directory`);
      fetchDrive();
    } catch (err: any) {
      setActionError(`Failed to create Google Sheet: ${err.message}`);
    }
  };

  const handleAppendRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleToken || !selectedSheetId) return;

    const confirmed = window.confirm(`Confirm: Append columns [${appendValues.join(', ')}] directly onto raw row block?`);
    if (!confirmed) return;

    clearMessages();
    try {
      await appendRowToGoogleSpreadsheet(googleToken, selectedSheetId, appendValues);
      setActionSuccess('Successfully appended row data directly into Sheet1 tab of Google Spreadsheet!');
      setAppendValues(['John Doe', 'john@example.com', 'Interested', new Date().toLocaleDateString()]);
    } catch (err: any) {
      setActionError(`Failed to append row: ${err.message}`);
    }
  };

  if (!googleToken) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/60 border border-indigo-500/10 rounded-2xl space-y-6">
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
          <Sparkles className="h-10 w-10 text-indigo-400 animate-pulse" />
        </div>
        <div className="space-y-2 max-w-lg">
          <h3 className="font-semibold text-white text-lg font-display">Enable Unified Google Workspace Control</h3>
          <p className="text-slate-400 text-xs leading-relaxed font-mono">
            Get instant access to real Gmail updates, schedule direct checks, upload pipeline ledger rows to structured Google Sheets, publish reports into Google Docs, and sync operations using Google Tasks!
          </p>
        </div>
        <button
          onClick={onLogin}
          className="gsi-material-button transition-transform active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
        >
          <div className="gsi-material-button-state"></div>
          <div className="gsi-material-button-content-wrapper">
            <div className="gsi-material-button-icon">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            </div>
            <span className="gsi-material-button-contents">Grant Google Workspace Authorizations</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Sync panel */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-indigo-500/10 pb-5">
        <div>
          <h2 className="text-xl font-display font-medium tracking-tight text-white flex items-center gap-2">
            <span className="inline-block p-1 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </span>
            <span>OmniBot Google Workspace Integration Suite</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Directly synchronizing business bookings and communications using Gmail, Drive, Docs, Sheets & Tasks.
          </p>
        </div>

        <button 
          onClick={loadAllWorkspaceData}
          className="flex items-center gap-1.5 bg-[#0e1320] hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Force Refresh Suite</span>
        </button>
      </div>

      {/* Success / Error notification */}
      {actionSuccess && (
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-450 font-mono animate-fade-in relative">
          <CheckCircle className="h-4 w-4 text-emerald-450 shrink-0 mt-0.5" />
          <div className="flex-1">{actionSuccess}</div>
          <button onClick={() => setActionSuccess(null)} className="text-[10px] text-emerald-500 hover:text-emerald-300 absolute right-3 font-bold uppercase">dismiss</button>
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-mono animate-fade-in relative">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">{actionError}</div>
          <button onClick={() => setActionError(null)} className="text-[10px] text-rose-500 hover:text-rose-300 absolute right-3 font-bold uppercase">dismiss</button>
        </div>
      )}

      {(tasksOfflineMode || gmailOfflineMode || driveOfflineMode) && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-500/15 bg-yellow-500/5 text-yellow-300 text-xs font-mono shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/2 rounded-full blur-xl pointer-events-none"></div>
          <AlertCircle className="h-4.5 w-4.5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-yellow-400">Notice: Operating in Sandbox Backup Mode</span>
            <p className="leading-relaxed text-[11px] text-slate-300">
              Real-time {tasksOfflineMode && 'Google Tasks'} {gmailOfflineMode && 'Gmail inbox'} {driveOfflineMode && 'Drive access'} fetch attempts received constraints (typically because the corresponding APIs are not fully enabled in your Google Cloud Platform project or consent scopes were unchecked). The application has successfully loaded high-fidelity mockups so you can still fully evaluate, test, and run CRM pipeline workflows seamlessly!
            </p>
          </div>
        </div>
      )}

      {/* Grid Sub-navigation */}
      <div className="grid grid-cols-4 bg-[#080c14] p-1.5 rounded-xl border border-white/5 font-mono text-[10.5px]">
        <button
          onClick={() => { setCurrentSubTab('overview'); clearMessages(); }}
          className={`py-2 rounded-lg transition-all font-bold ${
            currentSubTab === 'overview' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          🏢 OVERVIEW
        </button>
        <button
          onClick={() => { setCurrentSubTab('gmail'); clearMessages(); fetchGmail(); }}
          className={`py-2 rounded-lg transition-all font-bold ${
            currentSubTab === 'gmail' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          📨 GMAIL (10)
        </button>
        <button
          onClick={() => { setCurrentSubTab('tasks'); clearMessages(); fetchTasks(); }}
          className={`py-2 rounded-lg transition-all font-bold ${
            currentSubTab === 'tasks' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          📋 TASKS ({taskList.length})
        </button>
        <button
          onClick={() => { setCurrentSubTab('drive'); clearMessages(); fetchDrive(); }}
          className={`py-2 rounded-lg transition-all font-bold ${
            currentSubTab === 'drive' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          🗄️ STORAGE/DOCS
        </button>
      </div>

      {/* Pane Content */}
      <div className="bg-[#0b0e14] border border-white/5 rounded-2xl p-5 space-y-6">
        
        {/* SUBTAB: OVERVIEW */}
        {currentSubTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono">My Connection Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/40 p-4 border border-white/5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Gmail Access</span>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">Fetch inbox updates, review thread statistics, and dispatch test notifications.</p>
              </div>

              <div className="bg-slate-900/40 p-4 border border-white/5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Google Tasks Access</span>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">Read your active task timelines, add operations checklist logs, or check off resolved action items.</p>
              </div>

              <div className="bg-slate-900/40 p-4 border border-white/5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Drive, Docs & Sheets</span>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">Initialize a new secure Google Doc/Spreadsheet and populate client columns instantly.</p>
              </div>
            </div>

            <div className="bg-indigo-500/5 p-4 border border-indigo-500/10 rounded-xl space-y-3 font-mono text-xs">
              <div className="text-white font-bold text-[13px] flex items-center gap-2">
                <span>🔄 Synchronize Pipeline Status</span>
              </div>
              <p className="text-slate-300 text-xs leading-normal">
                Google Workspace services bind perfectly with client processes. When a new user completes a WhatsApp session, the system automatically schedules the calendar event, lists progress tasks in your agenda list, and exports leads database spreadsheets.
              </p>
            </div>
          </div>
        )}

        {/* SUBTAB: GMAIL */}
        {currentSubTab === 'gmail' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>Inbox Log Preview</span>
              </h3>

              {loadingGmail ? (
                <div className="flex items-center justify-center p-12 text-slate-500 text-xs font-mono">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                  Loading sandbox emails...
                </div>
              ) : gmailList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono bg-slate-900/30 border border-white/5 rounded-xl">
                  No recent messages found inside Gmail inbox.
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {gmailList.map(msg => (
                    <div key={msg.id} className="p-3 bg-slate-900/40 rounded-xl border border-white/5 text-xs font-sans leading-relaxed space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="font-bold text-white truncate max-w-[150px]">{msg.from}</span>
                        <span className="shrink-0">{msg.date}</span>
                      </div>
                      <div className="font-bold text-slate-200 truncate">{msg.subject}</div>
                      <p className="text-slate-400 text-[11px] line-clamp-2 italic">"{msg.snippet}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEND EMAIL FORM */}
            <div className="lg:col-span-6 bg-slate-900/20 p-4 rounded-xl border border-white/5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Send Real Workspace Email</span>
              </h3>

              <form onSubmit={handleSendEmail} className="space-y-3 text-xs leading-normal font-mono">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">To Recipient Address:</label>
                  <input 
                    type="email" 
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    placeholder="Enter email..."
                    className="w-full bg-[#080c14] border border-white/10 rounded-lg p-2 text-white placeholder-slate-600 focus:border-indigo-500/60 outline-none text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Subject Line:</label>
                  <input 
                    type="text" 
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="w-full bg-[#080c14] border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500/60 outline-none text-xs font-sans font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Message Body (Plain Text/HTML):</label>
                  <textarea 
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    rows={4}
                    className="w-full bg-[#080c14] border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500/60 outline-none text-xs font-sans"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={!emailTo.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-lg cursor-pointer transition-all active:scale-[0.98] uppercase tracking-wider font-mono text-[10.5px]"
                >
                  ✉️ Dispatch Real Email
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SUBTAB: GOOGLE TASKS */}
        {currentSubTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                <span>My Google Tasks Actions</span>
              </h3>

              {loadingTasks ? (
                <div className="flex items-center justify-center p-12 text-slate-500 text-xs font-mono">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                  Synching agenda items...
                </div>
              ) : taskList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono bg-slate-900/30 border border-white/5 rounded-xl">
                  No active/completed items found in your Google Tasks account. Create one below to begin!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {taskList.map(task => (
                    <div key={task.id} className="p-3 bg-slate-900/40 rounded-xl border border-white/5 flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input 
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() => handleToggleTask(task)}
                          className="h-4 w-4 mt-0.5 accent-emerald-500 cursor-pointer"
                          title="Toggle task completion status"
                        />
                        <div className="min-w-0">
                          <span className={`font-bold font-sans text-slate-200 block ${task.status === 'completed' ? 'line-through text-slate-550' : ''}`}>
                            {task.title}
                          </span>
                          {task.notes && (
                            <span className="text-[10.5px] italic text-slate-400 font-mono block mt-0.5 line-clamp-1">
                              {task.notes}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteTask(task.id, task.title)}
                        className="text-red-400 hover:text-red-300 hover:bg-slate-800 p-1 rounded transition-colors"
                        title="Delete task item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CREATE TASK FORM */}
            <div className="lg:col-span-6 bg-slate-900/20 p-4 rounded-xl border border-white/5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                <span>Initialize Google Task</span>
              </h3>

              <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs font-mono">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Task Name / Header:</label>
                  <input 
                    type="text" 
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="e.g., Audit @Zenith AI Resolutions rate"
                    className="w-full bg-[#080c14] border border-white/10 rounded-lg p-2 text-white placeholder-slate-600 focus:border-indigo-500/60 outline-none text-xs font-sans font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Task Notes / Metadata:</label>
                  <textarea 
                    value={newTaskNotes}
                    onChange={e => setNewTaskNotes(e.target.value)}
                    placeholder="Enter short description or URL resources..."
                    rows={3}
                    className="w-full bg-[#080c14] border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500/60 outline-none text-xs font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-lg cursor-pointer transition-all active:scale-[0.98] uppercase tracking-wider font-mono text-[10.5px]"
                >
                  🚀 Post Task to Workspace
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SUBTAB: DRIVE & SPREADSHEETS */}
        {currentSubTab === 'drive' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* FILE CREATION OPTIONS */}
              <div className="space-y-5 bg-slate-900/20 p-5 rounded-2xl border border-white/5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono">
                  Create Google Workspace Files
                </h3>
                
                <div className="space-y-4 font-mono text-xs">
                  {/* Docs creator */}
                  <div className="space-y-2 p-3 bg-slate-900/40 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-white font-bold text-[11px]">
                      <FileText className="h-4 w-4 text-blue-450" />
                      <span>Google Document Builder</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newDocTitle}
                        onChange={e => setNewDocTitle(e.target.value)}
                        className="flex-1 bg-[#080c14] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-sans font-bold"
                      />
                      <button
                        onClick={handleCreateDoc}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 font-bold rounded-lg text-[10px] cursor-pointer"
                      >
                        Create Doc
                      </button>
                    </div>
                  </div>

                  {/* Sheets creator */}
                  <div className="space-y-2 p-3 bg-slate-900/40 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-white font-bold text-[11px]">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-555" />
                      <span>Google Spreadsheet Creator</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newSheetTitle}
                        onChange={e => setNewSheetTitle(e.target.value)}
                        className="flex-1 bg-[#080c14] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-sans font-bold"
                      />
                      <button
                        onClick={handleCreateSheet}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 font-bold rounded-lg text-[10px] cursor-pointer"
                      >
                        Create Sheet
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* APPEND LEAD COLUMN ROW TO SHEET */}
              {selectedSheetId ? (
                <div className="bg-slate-900/20 p-5 rounded-2xl border border-white/5 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 font-mono">
                      Feed Spreadsheet Rows
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[8.5px] font-mono font-black bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 uppercase">Spreadsheet linked</span>
                  </div>

                  <form onSubmit={handleAppendRow} className="space-y-3.5 text-xs font-mono">
                    <p className="text-[10px] text-slate-400">Append test lead row vector data directly to sheet.</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Lead Name:</label>
                        <input 
                          type="text" 
                          value={appendValues[0]} 
                          onChange={e => setAppendValues(prev => [e.target.value, prev[1], prev[2], prev[3]])}
                          className="w-full bg-[#080c14] border border-white/10 rounded px-2 py-1 text-white text-[11px] font-sans"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Lead Email:</label>
                        <input 
                          type="email" 
                          value={appendValues[1]} 
                          onChange={e => setAppendValues(prev => [prev[0], e.target.value, prev[2], prev[3]])}
                          className="w-full bg-[#080c14] border border-white/10 rounded px-2 py-1 text-white text-[11px] font-sans"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Pipeline Status:</label>
                        <input 
                          type="text" 
                          value={appendValues[2]} 
                          onChange={e => setAppendValues(prev => [prev[0], prev[1], e.target.value, prev[3]])}
                          className="w-full bg-[#080c14] border border-white/10 rounded px-2 py-1 text-white text-[11px] font-sans"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Capture Date:</label>
                        <input 
                          type="text" 
                          value={appendValues[3]} 
                          onChange={e => setAppendValues(prev => [prev[0], prev[1], prev[2], e.target.value])}
                          className="w-full bg-[#080c14] border border-white/10 rounded px-2 py-1 text-white text-[11px] font-mono"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer text-[10.5px] uppercase"
                    >
                      ⚡ Feed Matrix Row
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-slate-900/20 p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-2">
                  <FileSpreadsheet className="h-8 w-8 text-slate-650" />
                  <h4 className="text-xs font-bold text-slate-400 font-mono uppercase">Row Feeder Sandbox</h4>
                  <p className="text-[10.5px] text-slate-500 max-w-sm font-sans leading-normal">
                    Create a safe Google Spreadsheet above first using the API. Once instantiated, you can instantly append resolved leads and telemetry arrays directly online!
                  </p>
                </div>
              )}
            </div>

            {/* STORAGE INDEX DIRECTORY LIST */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span>My Workspace Storage (Drive Index)</span>
              </h3>

              {loadingDrive ? (
                <div className="flex items-center justify-center p-12 text-slate-500 text-xs font-mono">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                  Loading Drive File Stream...
                </div>
              ) : driveList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono bg-slate-900/30 border border-white/5 rounded-xl">
                  No Document or Spreadsheet templates found created in Drive.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {driveList.map(file => (
                    <div key={file.id} className="p-3 bg-slate-900/40 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-xs leading-normal">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {file.mimeType.includes('spreadsheet') ? (
                          <FileSpreadsheet className="h-5 w-5 text-emerald-450 shrink-0" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-slate-200 block truncate font-sans">{file.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Mime: {file.mimeType.replace('application/vnd.google-apps.', '')}</span>
                        </div>
                      </div>

                      {file.webViewLink && (
                        <a 
                          href={file.webViewLink} 
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          rel="noopener noreferrer" 
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded border border-white/10 flex items-center gap-1 font-mono text-[10px] cursor-pointer"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
