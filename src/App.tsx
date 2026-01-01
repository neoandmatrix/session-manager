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
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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
    if (selectedSessionId === id) setSelectedSessionId(null);
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

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div style={{ display: 'flex', width: '800px', height: '600px', fontFamily: 'Segoe UI, sans-serif', color: '#333', backgroundColor: '#fff' }}>
      
      {/* LEFT SIDEBAR: Session List */}
      <div style={{ width: '280px', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Sessions</h2>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {sessions.length === 0 && <p style={{ padding: '16px', color: '#666', fontSize: '14px' }}>No closed sessions found.</p>}
          
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => setSelectedSessionId(session.id)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: selectedSessionId === session.id ? '#e3f2fd' : 'transparent',
                borderBottom: '1px solid #eee',
                borderLeft: selectedSessionId === session.id ? '4px solid #2196f3' : '4px solid transparent',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#666' }}>
                  {new Date(session.timestamp).toLocaleDateString()}
                </span>
                {session.isSaved && (
                  <span style={{ fontSize: '10px', backgroundColor: '#d4edda', color: '#155724', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                    SAVED
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT CONTENT: Details */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedSession ? (
          <>
            {/* Header Area */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Session Name</label>
                <input 
                  value={selectedSession.name} 
                  onChange={(e) => updateName(selectedSession.id, e.target.value)}
                  style={{ 
                    width: '100%', padding: '8px 12px', fontSize: '16px', 
                    border: '1px solid #ccc', borderRadius: '6px', outline: 'none'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => restoreSession(selectedSession.tabs)}
                  style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                >
                  Restore All Tabs
                </button>
                <button 
                  onClick={() => toggleSave(selectedSession.id)}
                  style={{ 
                    backgroundColor: selectedSession.isSaved ? '#28a745' : '#ffc107', 
                    color: selectedSession.isSaved ? 'white' : '#212529',
                    border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' 
                  }}
                >
                  {selectedSession.isSaved ? '✓ Keep Forever' : '⚠ Auto-Delete'}
                </button>
                <button 
                  onClick={() => deleteSession(selectedSession.id)}
                  style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginLeft: 'auto', fontWeight: '500' }}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              
              {/* Tabs List */}
              <h3 style={{ fontSize: '16px', marginTop: 0, marginBottom: '12px', color: '#444' }}>
                Tabs ({selectedSession.tabs.length})
              </h3>
              <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                {selectedSession.tabs.map((tab, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', alignItems: 'center', padding: '10px 12px', 
                    borderBottom: idx !== selectedSession.tabs.length - 1 ? '1px solid #f0f0f0' : 'none',
                    backgroundColor: '#fff'
                  }}>
                    {tab.favIconUrl ? (
                      <img src={tab.favIconUrl} alt="" style={{ width: '16px', height: '16px', marginRight: '12px', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '16px', height: '16px', marginRight: '12px', backgroundColor: '#eee', borderRadius: '50%' }} />
                    )}
                    <a 
                      href={tab.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ textDecoration: 'none', color: '#333', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={tab.title}
                    >
                      {tab.title}
                    </a>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#444' }}>Notes</h3>
                <textarea 
                  placeholder="Add notes about this session..."
                  value={selectedSession.note}
                  onChange={(e) => updateNote(selectedSession.id, e.target.value)}
                  style={{ 
                    width: '100%', height: '100px', padding: '12px', 
                    border: '1px solid #ccc', borderRadius: '8px', 
                    resize: 'vertical', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.5'
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', backgroundColor: '#fcfcfc' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗂️</div>
            <p style={{ fontSize: '16px' }}>Select a session to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;