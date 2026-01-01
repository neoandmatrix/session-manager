// Define interfaces for type safety
interface Tab {
  title: string;
  url: string;
  favIconUrl?: string;
}

interface Session {
  id: string;
  timestamp: number;
  tabs: Tab[];
  name: string;
  isSaved: boolean;
  note: string;
}

interface StorageData {
  currentSession?: Session;
  archives?: Session[];
}

// 1. SNAPSHOT STRATEGY: Monitor tabs and keep 'currentSession' updated

let debounceTimer: ReturnType<typeof setTimeout>;

async function updateCurrentSession() {
  // Debounce to prevent excessive writes to storage on every minor tab update
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const tabs = await chrome.tabs.query({});
    const session: Session = {
      id: "current", // Temporary ID
      timestamp: Date.now(),
      tabs: tabs.map(t => ({ 
        title: t.title || "New Tab", 
        url: t.url || "", 
        favIconUrl: t.favIconUrl 
      })),
      name: "Current Session",
      isSaved: false,
      note: ""
    };
    await chrome.storage.local.set({ currentSession: session });
  }, 500);
}

// Listen to any tab change to update our snapshot
chrome.tabs.onUpdated.addListener(updateCurrentSession);
chrome.tabs.onCreated.addListener(updateCurrentSession);
chrome.tabs.onRemoved.addListener(updateCurrentSession);

// 2. ARCHIVE ON STARTUP: When browser opens, archive the LAST session
chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.local.get(['currentSession', 'archives']);
  const data = result as StorageData;
  const archives = data.archives || [];

  if (data.currentSession && data.currentSession.tabs && data.currentSession.tabs.length > 0) {
    // Convert the "current" session from last time into a permanent archive
    const lastSession: Session = {
      ...data.currentSession,
      id: crypto.randomUUID(), // Use native UUID
      name: `Session - ${new Date(data.currentSession.timestamp).toLocaleString()}`,
      isSaved: false, // Default: delete after 24h
      note: ""
    };
    // Add to the beginning of the list
    archives.unshift(lastSession);
    await chrome.storage.local.set({ archives, currentSession: null });
  }
});

// 3. AUTO-DELETE: Check every hour
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanup') {
    const result = await chrome.storage.local.get('archives');
    const data = result as StorageData;
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    // Filter out sessions that are OLD AND NOT MARKED "isSaved"
    const validSessions = (data.archives || []).filter((session) => {
      if (session.isSaved) return true; // Keep manually saved sessions
      return (now - session.timestamp) < twentyFourHours;
    });

    await chrome.storage.local.set({ archives: validSessions });
  }
});

// 4. KEYBOARD SHORTCUTS
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-session') {
    // Logic to manually trigger a save via keyboard shortcut
    const tabs = await chrome.tabs.query({});
    if (tabs.length === 0) return;

    const newSession: Session = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      tabs: tabs.map(t => ({ 
        title: t.title || "New Tab", 
        url: t.url || "", 
        favIconUrl: t.favIconUrl 
      })),
      name: `Manual Save - ${new Date().toLocaleString()}`,
      isSaved: true, // Mark as saved so it isn't auto-deleted
      note: "Saved via keyboard shortcut"
    };

    const result = await chrome.storage.local.get('archives');
    const data = result as StorageData;
    const archives = data.archives || [];
    archives.unshift(newSession);
    await chrome.storage.local.set({ archives });
  }
});