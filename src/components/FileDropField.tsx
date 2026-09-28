import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react';

type FileDropFieldProps = {
  name: string;
  label: string;
  accept: string;
  acceptLabel: string;
  required?: boolean;
  describedBy?: string;
  dropHint: string;
  children?: ReactNode;
};

function fileMatchesAccept(file: File, accept: string): boolean {
  const tokens = accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return tokens.some((token) => {
    if (token.startsWith('.')) {
      return fileName.endsWith(token);
    }
    if (token.endsWith('/*')) {
      return fileType.startsWith(token.slice(0, -1));
    }
    return fileType === token;
  });
}

export default function FileDropField({
  name,
  label,
  accept,
  acceptLabel,
  required = false,
  describedBy,
  dropHint,
  children,
}: FileDropFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  function assignFile(file: File | undefined) {
    const input = inputRef.current;
    if (!input || !file) return;

    if (!fileMatchesAccept(file, accept)) {
      setError(`Please choose a ${acceptLabel}.`);
      setFileName('');
      input.value = '';
      return;
    }

    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    setFileName(file.name);
    setError('');
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    assignFile(event.target.files?.[0]);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    assignFile(event.dataTransfer.files?.[0]);
  }

  const errorId = `${inputId}-error`;
  const describedByIds = [describedBy, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="form-field">
      <label htmlFor={inputId}>
        <span>{label}</span>
      </label>
      <div
        className={`file-drop${isDragging ? ' file-drop--active' : ''}${fileName ? ' file-drop--filled' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          className="file-drop__input"
          type="file"
          name={name}
          required={required}
          accept={accept}
          aria-describedby={describedByIds || undefined}
          onChange={handleChange}
        />
        <p className="file-drop__prompt">
          {fileName ? (
            <>
              Selected: <strong>{fileName}</strong>
            </>
          ) : (
            dropHint
          )}
        </p>
        <p className="file-drop__browse">
          Drag and drop here, or{' '}
          <span className="file-drop__browse-link">browse</span>
        </p>
      </div>
      {error ? (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {children}
    </div>
  );
}
