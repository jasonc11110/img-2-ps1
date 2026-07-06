import type { PSSettings } from "../lib/ps1Renderer";

interface Props {
  settings: PSSettings;
  onChange: (s: PSSettings) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="control-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="control-value">{value}</span>
    </label>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="control-section">
      <div className="control-section-label">{label}</div>
      {children}
    </div>
  );
}

export default function Controls({ settings, onChange }: Props) {
  const set = (k: keyof PSSettings) => (v: number) =>
    onChange({ ...settings, [k]: v });

  return (
    <div className="controls">
      <Section label="Image">
        <Slider
          label="Brightness"
          value={settings.brightness}
          min={-1}
          max={1}
          step={0.02}
          onChange={set("brightness")}
        />
        <Slider
          label="Contrast"
          value={settings.contrast}
          min={0}
          max={2}
          step={0.02}
          onChange={set("contrast")}
        />
        <Slider
          label="Saturation"
          value={settings.saturation}
          min={0}
          max={2}
          step={0.02}
          onChange={set("saturation")}
        />
        <Slider
          label="Exposure"
          value={settings.exposure}
          min={0.2}
          max={2.5}
          step={0.02}
          onChange={set("exposure")}
        />
        <Slider
          label="Shadows"
          value={settings.shadows}
          min={0}
          max={1}
          step={0.02}
          onChange={set("shadows")}
        />
        <Slider
          label="Vibrance"
          value={settings.vibrance}
          min={0}
          max={2}
          step={0.02}
          onChange={set("vibrance")}
        />
      </Section>

      <Section label="PS1">
        <Slider
          label="Texture Size"
          value={settings.textureSize}
          min={16}
          max={256}
          onChange={set("textureSize")}
        />
        <Slider
          label="Snap Resolution"
          value={settings.snapResolution}
          min={40}
          max={640}
          onChange={set("snapResolution")}
        />
        <Slider
          label="Color Bits"
          value={settings.colorBits}
          min={3}
          max={8}
          step={0.5}
          onChange={set("colorBits")}
        />
        <Slider
          label="Dither Intensity"
          value={settings.ditherIntensity}
          min={0}
          max={1}
          step={0.05}
          onChange={set("ditherIntensity")}
        />
        <Slider
          label="Render Resolution"
          value={settings.renderResolution}
          min={80}
          max={640}
          onChange={set("renderResolution")}
        />
      </Section>
    </div>
  );
}
