import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import commonES from "./locales/es/common.json";
import authES from "./locales/es/auth.json";
import dashboardES from "./locales/es/dashboard.json";
import projectsES from "./locales/es/projects.json";
import settingsES from "./locales/es/settings.json";

import commonEN from "./locales/en/common.json";
import authEN from "./locales/en/auth.json";
import dashboardEN from "./locales/en/dashboard.json";
import projectsEN from "./locales/en/projects.json";
import settingsEN from "./locales/en/settings.json";

const resources = {
  es: {
    common: commonES,
    auth: authES,
    dashboard: dashboardES,
    projects: projectsES,
    settings: settingsES,
  },
  en: {
    common: commonEN,
    auth: authEN,
    dashboard: dashboardEN,
    projects: projectsEN,
    settings: settingsEN,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "es",
    defaultNS: "common",
    ns: ["common", "auth", "dashboard", "projects", "settings"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
  });

export default i18n;
