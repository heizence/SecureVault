import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector) // 사용자의 시스템 언어를 감지
  .use(initReactI18next) // i18n 인스턴스를 react-i18next에 전달
  .init({
    // 기본 언어 파일 경로
    resources: {
      en: {
        translation: await fetch("../public/locales/en/texts.json").then((res) => res.json()),
      },
      ko: {
        translation: await fetch("../public/locales/ko/texts.json").then((res) => res.json()),
      },
    },
    fallbackLng: "en", // 언어 감지 실패 시 기본 언어
    interpolation: {
      escapeValue: false, // React는 이미 XSS 방어 기능이 있으므로 false로 설정
    },
  });

export default i18n;
