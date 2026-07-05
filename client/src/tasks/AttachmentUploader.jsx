import { useState } from 'react';
import { uploadsApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';

export default function AttachmentUploader({ attachments, onChange }) {
  const { showToast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null);

  async function handleFiles(files) {
    const file = files[0];
    if (!file) return;

    setProgress(0);
    try {
      const res = await uploadsApi.upload(file, setProgress);
      onChange([...(attachments || []), { url: res.data.url, name: res.data.filename }]);
      showToast('File uploaded', 'success');
    } catch (err) {
      showToast('Upload failed', 'error');
    } finally {
      setProgress(null);
    }
  }

  function removeAttachment(index) {
    const next = [...attachments];
    next.splice(index, 1);
    onChange(next);
  }

  return (
    <div>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => document.getElementById('attachment-input').click()}
      >
        Drag a file here, or click to browse
        <input
          id="attachment-input"
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {progress !== null && (
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {(attachments || []).map((a, i) => (
        <div key={i} className="attachment-row">
          <span>{a.name}</span>
          <span>
            <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${a.url}`} target="_blank" rel="noreferrer" className="btn btn-sm">
              Download
            </a>
            <button className="btn btn-sm btn-danger" style={{ marginLeft: 6 }} onClick={() => removeAttachment(i)}>
              Delete
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
