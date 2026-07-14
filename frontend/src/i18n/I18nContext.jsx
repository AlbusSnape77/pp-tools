import { createContext, useContext, useMemo } from "react";
import { formatMessage, getMessage, normalizeLanguage } from "./messages";

const defaultValue = {
  language: "zh",
  config: {},
  t: (path, values) => formatMessage(getMessage("zh", path), values),
};

const I18nContext = createContext(defaultValue);

export function I18nProvider({ language, config = {}, children }) {
  const value = useMemo(() => {
    const normalized = normalizeLanguage(language);
    return {
      language: normalized,
      config,
      t: (path, values) => formatMessage(getMessage(normalized, path), values),
    };
  }, [language, config]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
