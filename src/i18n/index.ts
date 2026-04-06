import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import commonES from "./locales/es/common.json";
import authES from "./locales/es/auth.json";
import dashboardES from "./locales/es/dashboard.json";
import projectsES from "./locales/es/projects.json";
import settingsES from "./locales/es/settings.json";
import expensesES from "./locales/es/expenses.json";
import messagesES from "./locales/es/messages.json";
import budgetES from "./locales/es/budget.json";
import invoicesES from "./locales/es/invoices.json";
import contactsES from "./locales/es/contacts.json";
import taxesES from "./locales/es/taxes.json";

import commonEN from "./locales/en/common.json";
import authEN from "./locales/en/auth.json";
import dashboardEN from "./locales/en/dashboard.json";
import projectsEN from "./locales/en/projects.json";
import settingsEN from "./locales/en/settings.json";
import expensesEN from "./locales/en/expenses.json";
import messagesEN from "./locales/en/messages.json";
import budgetEN from "./locales/en/budget.json";
import invoicesEN from "./locales/en/invoices.json";
import contactsEN from "./locales/en/contacts.json";
import taxesEN from "./locales/en/taxes.json";

const resources = {
  es: {
    common: commonES,
    auth: authES,
    dashboard: dashboardES,
    projects: projectsES,
    settings: settingsES,
    expenses: expensesES,
    messages: messagesES,
    budget: budgetES,
    invoices: invoicesES,
    contacts: contactsES,
    taxes: taxesES,
  },
  en: {
    common: commonEN,
    auth: authEN,
    dashboard: dashboardEN,
    projects: projectsEN,
    settings: settingsEN,
    expenses: expensesEN,
    messages: messagesEN,
    budget: budgetEN,
    invoices: invoicesEN,
    contacts: contactsEN,
    taxes: taxesEN,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "es",
    defaultNS: "common",
    ns: ["common", "auth", "dashboard", "projects", "settings", "expenses", "messages", "budget", "invoices", "contacts", "taxes"],
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
