import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

let socket;

export default function UploadComponent({ documentId, userToken }) {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('Idle');
    const [progressInfo, setProgressInfo] = useState('');
    const [liveNotification, setLiveNotification] = useState('');

    // Establish WebSocket Connection lifecycle hook
    useEffect(() => {
        // Backend server URL connect link
        socket = io('http://localhost:5000');

        // Document specific room join karo
        socket.emit('join_document_room', documentId);

        // Listen for updates from other users
        socket.on('document_updated', (data) => {
            setLiveNotification(data.message);
            // Alert box block for evaluation visibility
            alert(`Real-Time Update: ${data.message}`);
        });

        return () => {
            socket.disconnect();
        };
    }, [documentId]);

    const executeSecureUpload = async () => {
        if (!file) return;
        try {
            setStatus('Requesting');
            const response = await fetch('http://localhost:5000/api/documents/upload-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({ documentId, fileName: file.name, fileType: file.type })
            });

            const data = await response.json();
            const { uploadUrl, allocatedVersion } = data;

            setStatus('Uploading');
            const s3Upload = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });

            if (s3Upload.ok) {
                setStatus('Success');
                setProgressInfo(`Version v${allocatedVersion} pushed completely.`);
            }
        } catch (error) {
            setStatus('Error');
        }
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '400px' }}>
            <h3>Cloud Document Workspace</h3>
            
            {liveNotification && (
                <div style={{ background: '#fff3cd', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
                    ⚠️ <strong>Live Feed:</strong> {liveNotification}
                </div>
            )}

            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            <button onClick={executeSecureUpload} style={{ marginTop: '10px', display: 'block' }}>
                Upload Version
            </button>
        </div>
    );
}