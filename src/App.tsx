import { useEffect, useState } from 'react';

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

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);

  // Load sessions from storage
  useEffect(() => {
    chrome.storage.local.get('archives', (result) => {
      const data = result as { archives?: Session[] };
      setSessions(data.archives || []);
    });
  }, []);

  const updateSessionsInStorage = (newSessions: Session[]) => {
    setSessions(newSessions);
    chrome.storage.local.set({ archives: newSessions });
  };

  const deleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    updateSessionsInStorage(updated);
  };

  const toggleSave = (id: string) => {
    const updated = sessions.map(s => 
      s.id === id ? { ...s, isSaved: !s.isSaved } : s
    );
    updateSessionsInStorage(updated);
  };

  const updateName = (id: string, newName: string) => {
    const updated = sessions.map(s => 
      s.id === id ? { ...s, name: newName } : s
    );
    updateSessionsInStorage(updated);
  };

  const updateNote = (id: string, newNote: string) => {
    const updated = sessions.map(s => 
      s.id === id ? { ...s, note: newNote } : s
    );
    updateSessionsInStorage(updated);
  };

  const restoreSession = (tabs: Tab[]) => {
    tabs.forEach(tab => chrome.tabs.create({ url: tab.url }));
  };

  return (
    <div style={{ width: '400px', padding: '16px', fontFamily: 'sans-serif' }}>
      <h2>Previous Sessions</h2>
      {sessions.length === 0 && <p>No closed sessions found.</p>}
      
      {sessions.map(session => (
        <div key={session.id} style={{ border: '1px solid #ddd', marginBottom: '10px', padding: '10px', borderRadius: '8px' }}>
          
          {/* Header: Name and Date */}
          <input 
            value={session.name} 
            onChange={(e) => updateName(session.id, e.target.value)}
            style={{ fontWeight: 'bold', width: '100%', marginBottom: '5px' }}
          />
          <div style={{ fontSize: '12px', color: '#666' }}>
            {new Date(session.timestamp).toLocaleString()}
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button onClick={() => restoreSession(session.tabs)}>Restore Tabs</button>
            <button 
              onClick={() => toggleSave(session.id)}
              style={{ backgroundColor: session.isSaved ? '#d4edda' : '#f8d7da' }}
            >
              {session.isSaved ? 'Saved (Permanent)' : 'Auto-Delete'}
            </button>
            <button onClick={() => deleteSession(session.id)}>Delete</button>
          </div>

          {/* Notes Section */}
          <textarea 
            placeholder="Add a note..."
            value={session.note}
            onChange={(e) => updateNote(session.id, e.target.value)}
            style={{ width: '100%', marginTop: '10px', height: '50px' }}
          />
          
        </div>
      ))}
    </div>
  );
}

export default App;