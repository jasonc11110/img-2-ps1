import { useRef, type ChangeEvent, type DragEvent } from "react";

interface Props {
  onImage: (img: HTMLImageElement) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onImage, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => onImage(img);
    img.src = URL.createObjectURL(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();

  return (
    <div
      className="uploader"
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        hidden
        disabled={disabled}
      />
      <div className="uploader-content">
        <span className="uploader-icon">+</span>
        <p>Drop a photo or click to upload</p>
      </div>
    </div>
  );
}
