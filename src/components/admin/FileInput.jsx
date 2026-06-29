import { useState, useRef } from 'react';

export default function FileInput({ label, accept = 'image/png,image/jpeg,image/jpg,image/gif,image/webp', onChange, onRemove, currentUrl }) {
  const [preview, setPreview] = useState(currentUrl || null);
  const fileRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    onChange(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleRemove = () => {
    if (fileRef.current) fileRef.current.value = '';
    setPreview(null);
    onChange(null);
    if (onRemove) onRemove();
  };

  return (
    <div className="admin-field">
      <label>{label}</label>
      <div className="admin-file-wrap">
        {preview && <img src={preview} alt="" className="admin-file-preview" onError={e => { e.target.style.display = 'none'; }} />}
        <div className="admin-file-inputs">
          <input ref={fileRef} type="file" accept={accept} onChange={handleChange} />
          {preview && <button type="button" className="admin-btn-sm admin-btn-delete" onClick={handleRemove}>Hapus</button>}
        </div>
      </div>
    </div>
  );
}
