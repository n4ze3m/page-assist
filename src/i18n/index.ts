import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./lang/en";
import { pt } from "./lang/pt";
import { fr } from "./lang/fr";
import { ru } from "./lang/ru";
import { ml } from "./lang/ml";
import { zh } from "./lang/zh";
import { ja } from "./lang/ja";
import { it } from "./lang/it";
import { es } from "./lang/es";
import { fa } from "./lang/fa";
import { de } from "./lang/de";
import { da } from "./lang/da";
import { no } from "./lang/no";
import LanguageDetector from 'i18next-browser-languagedetector';

const supportedLanguages = ['en', 'zh', 'ja', 'fa', 'de', 'da', 'no'];

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: en,
            es: es,
            fr: fr,
            "it": it,
            ml: ml,
            "pt-BR": pt,
            "zh-CN": zh,
            ru: ru,
            "ru-RU": ru,
            zh: zh,
            ja: ja,
            "ja-JP": ja,
            fa: fa,
            "fa-IR": fa,
            da: da,
            no: no,
            de: de
        },
        fallbackLng: "en",
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        },
        supportedLngs: supportedLanguages,
        lng: localStorage.getItem("i18nextLng") || "en",
    });

export default i18n;