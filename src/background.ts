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
  restoredWindows?: Record<number, string>; // windowId -> sessionId mapping
}

// 1. SNAPSHOT STRATEGY: Monitor tabs and keep 'currentSession' updated
// Also track tabs per window for restored session updates

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
    
    // Also update any restored sessions with their window's current tabs
    await updateRestoredSessions();
  }, 500);
}

// Update restored sessions with current tabs from their windows
async function updateRestoredSessions() {
  const result = await chrome.storage.local.get(['restoredWindows', 'archives']);
  const data = result as StorageData;
  const restoredWindows = data.restoredWindows || {};
  let archives = data.archives || [];
  
  // Check if any restored windows still exist
  const windowIds = Object.keys(restoredWindows).map(Number);
  if (windowIds.length === 0) return;
  
  let updated = false;
  
  for (const windowId of windowIds) {
    const sessionId = restoredWindows[windowId];
    
    try {
      // Get tabs from this specific window
      const windowTabs = await chrome.tabs.query({ windowId });
      
      if (windowTabs.length > 0) {
        // Update the session in archives
        archives = archives.map(session => {
          if (session.id === sessionId) {
            updated = true;
            return {
              ...session,
              timestamp: Date.now(),
              tabs: windowTabs.map(t => ({
                title: t.title || "New Tab",
                url: t.url || "",
                favIconUrl: t.favIconUrl
              }))
            };
          }
          return session;
        });
      }
    } catch {
      // Window no longer exists, remove from tracking
      delete restoredWindows[windowId];
      updated = true;
    }
  }
  
  if (updated) {
    await chrome.storage.local.set({ archives, restoredWindows });
  }
}

// Listen for window close to clean up restored window tracking
chrome.windows.onRemoved.addListener(async (windowId) => {
  const result = await chrome.storage.local.get('restoredWindows');
  const data = result as StorageData;
  const restoredWindows = data.restoredWindows || {};
  
  if (restoredWindows[windowId]) {
    delete restoredWindows[windowId];
    await chrome.storage.local.set({ restoredWindows });
  }
});

// Message handler for restore session requests from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'RESTORE_SESSION') {
    const { sessionId, tabs } = message;
    
    // Get valid URLs
    const urls = tabs.map((t: Tab) => t.url).filter((url: string) => url && url !== '');
    
    if (urls.length === 0) {
      sendResponse({ success: false, error: 'No valid URLs' });
      return true;
    }
    
    // Create a new window with the first URL, then add remaining tabs
    chrome.windows.create({ url: urls[0] }, async (newWindow) => {
      if (newWindow && newWindow.id) {
        // Create remaining tabs in this window
        for (let i = 1; i < urls.length; i++) {
          await chrome.tabs.create({ windowId: newWindow.id, url: urls[i] });
        }
        
        // Store the mapping: windowId -> sessionId
        const result = await chrome.storage.local.get('restoredWindows');
        const data = result as StorageData;
        const restoredWindows = data.restoredWindows || {};
        restoredWindows[newWindow.id] = sessionId;
        await chrome.storage.local.set({ restoredWindows });
        
        sendResponse({ success: true, windowId: newWindow.id });
      } else {
        sendResponse({ success: false, error: 'Failed to create window' });
      }
    });
    
    return true; // Keep message channel open for async response
  }
});

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