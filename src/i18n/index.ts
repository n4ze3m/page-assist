import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./lang/en";
import { ru } from "./lang/ru";
import { ml } from "./lang/ml";
import { zh } from "./lang/zh";
import { ja } from "./lang/ja";
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: en,
            ml: ml,
            "zh-CN": zh,
            ru: ru,
            "ru-RU": ru,
            zh: zh,
            ja: ja,
            "ja-JP": ja
        },
        fallbackLng: "en",
        lng: localStorage.getItem("i18nextLng") || "en",
    })

export default i18n;