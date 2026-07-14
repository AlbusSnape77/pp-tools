import { BEAUTY_FILTERS } from "./beautyRenderer";
import { useI18n } from "../../i18n/I18nContext";

const CONTROL_KEYS = ["skin", "white", "slim", "eye", "blush"];

export default function BeautyControls({
  settings,
  filterId,
  status,
  collapsed,
  onToggle,
  onSettingChange,
  onFilterChange,
  onCompareChange,
  onCapture,
  onSwitchCamera,
  onStop,
}) {
  const { t } = useI18n();
  return (
    <aside className={`beauty-controls${collapsed ? " is-collapsed" : ""}`} aria-label={t("camera.controls")}>
      <button className="panel-toggle" type="button" onClick={onToggle} aria-expanded={!collapsed}>
        {collapsed ? t("camera.openControls") : t("camera.closeControls")}
      </button>
      {!collapsed && (
        <div className="beauty-controls-body">
          <div className="control-heading">
            <div>
              <span>BEAUTY STUDIO</span>
              <h2>{t("camera.controls")}</h2>
            </div>
            <span className="local-badge">{t("camera.local")}</span>
          </div>
          <div className="beauty-sliders">
            {CONTROL_KEYS.map((key) => {
              const label = t(`camera.parameters.${key}`);
              return (
              <label className="beauty-slider" key={key}>
                <span>{label}</span>
                <input
                  aria-label={label}
                  type="range"
                  min="0"
                  max="100"
                  value={settings[key]}
                  onChange={(event) => onSettingChange(key, Number(event.target.value))}
                />
                <output>{settings[key]}</output>
              </label>
              );
            })}
          </div>
          <div className="filter-group" aria-label={t("camera.filter")}>
            <span className="control-label">{t("camera.filter")}</span>
            <div className="filter-list">
              {BEAUTY_FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter.id}
                  className={filter.id === filterId ? "is-active" : ""}
                  onClick={() => onFilterChange(filter.id)}
                >
                  {t(`camera.filters.${filter.id}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="camera-actions">
            <button
              type="button"
              disabled={status !== "running"}
              onPointerDown={() => onCompareChange(true)}
              onPointerUp={() => onCompareChange(false)}
              onPointerLeave={() => onCompareChange(false)}
            >{t("camera.originalHold")}</button>
            <button type="button" disabled={status !== "running"} onClick={onSwitchCamera}>{t("camera.switchCamera")}</button>
            <button className="capture-button" type="button" disabled={status !== "running"} onClick={onCapture}>{t("camera.capture")}</button>
            <button type="button" disabled={status !== "running"} onClick={onStop}>{t("camera.stop")}</button>
          </div>
        </div>
      )}
    </aside>
  );
}
