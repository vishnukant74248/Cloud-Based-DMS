import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const BACKEND_URL = "http://localhost:5005";

function App() {
  const [token, setToken] = useState("");
  const [documentId, setDocumentId] = useState(101);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tags, setTags] = useState(""); // Naya State Tags ke liye
  
  // Search States
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Real-time states
  const [currentVersion, setCurrentVersion] = useState(1);
  const [liveMessage, setLiveMessage] = useState("Connecting to live sync...");

  useEffect(() => {
    const socket = io(BACKEND_URL);
    socket.emit('join_document_room', documentId);
    socket.on('document_updated', (data) => {
      setLiveMessage(data.message);
      setCurrentVersion(data.version);
    });
    return () => socket.disconnect();
  }, [documentId]);

  const fetchTestToken = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/test-token`);
      setToken(res.data.token);
      alert("Token acquired successfully!");
    } catch (err) {
      alert("Error fetching token. Make sure backend server is running on port 5005");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!token) return alert("Please fetch a Test Token first!");
    if (!selectedFile) return alert("Please choose a file first!");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("documentId", documentId);
      formData.append("tags", tags); // Tags ko payload mein bheja

      const response = await axios.post(
        `${BACKEND_URL}/api/documents/upload-url`,
        formData,
        {
          headers: { 
            Authorization: token,
            "Content-Type": "multipart/form-data"
          } 
        }
      );

      if (response.data.success) {
        alert(`Success! Saved with tags. Version: v${response.data.allocatedVersion}`);
        setTags(""); // Reset tags input
      }
    } catch (err) {
      console.error(err);
      alert("Upload error.");
    }
  };

  // Naya Search Function
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!token) return alert("Please fetch a Test Token first!");
    
    try {
      const response = await axios.get(`${BACKEND_URL}/api/documents/search?query=${searchKeyword}`, {
        headers: { Authorization: token }
      });
      setSearchResults(response.data.results);
    } catch (err) {
      console.error(err);
      alert("Search request failed");
    }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>📄 Cloud-Based Document Management System</h2>
      <hr />

      {/* Step 1: Auth */}
      <div style={{ margin: '20px 0', padding: '15px', background: '#f0f2f5', borderRadius: '8px' }}>
        <h3>Step 1: Authentication</h3>
        <button onClick={fetchTestToken} style={{ padding: '8px 12px', cursor: 'pointer' }}>
          Fetch Editor Token
        </button>
        <p style={{ wordBreak: 'break-all', fontSize: '12px', color: token ? 'green' : 'red' }}>
          {token ? `Active Token: ${token.substring(0, 30)}...` : "Status: Unauthorized"}
        </p>
      </div>

      {/* Live Stream */}
      <div style={{ margin: '20px 0', padding: '15px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '8px' }}>
        <h3>⚡ Real-time Workspace Stream</h3>
        <p><strong>Current Active Version:</strong> v{currentVersion}</p>
        <p style={{ color: '#0050b3', fontStyle: 'italic' }}>Status: {liveMessage}</p>
      </div>

      {/* Step 2: Upload & Tag */}
      <div style={{ margin: '20px 0', padding: '15px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Step 2: Upload Document & Add Tags</h3>
        <form onSubmit={handleUpload}>
          <div style={{ marginBottom: '10px' }}>
            <label>Document ID: </label>
            <input type="number" value={documentId} onChange={(e) => setDocumentId(Number(e.target.value))} style={{ width: '60px', padding: '4px' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Tags (Comma separated): </label>
            <input type="text" placeholder="e.g. BTech, Exam, Report" value={tags} onChange={(e) => setTags(e.target.value)} style={{ width: '90%', padding: '6px', marginTop: '4px' }} />
          </div>
          <button type="submit" style={{ padding: '8px 15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Request Upload & Sync
          </button>
        </form>
      </div>

      {/* Step 3: Advanced Search & Tagging */}
      <div style={{ margin: '20px 0', padding: '15px', background: '#fffef0', border: '1px solid #ffe58f', borderRadius: '8px' }}>
        <h3>🔍 Advanced Search & Tagging Filter</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Search by file name or tags..." 
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ flex: 1, padding: '8px' }}
          />
          <button type="submit" style={{ padding: '8px 15px', background: '#ff9900', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Search
          </button>
        </form>

        {/* Results display */}
        {searchResults.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f2f2f2' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>File Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Version</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Tags</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{doc.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{doc.file_name || "N/A"}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>v{doc.current_version}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', color: '#d46b08' }}>{doc.tags || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: '13px', color: '#8c8c8c' }}>No matching documents found. Try searching 'BTech' or file extension!</p>
        )}
      </div>

    </div>
  );
}

export default App;