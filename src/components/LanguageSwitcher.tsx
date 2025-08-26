import { useTranslation } from "react-i18next";
import "./LanguageSwitcher.css";

interface LanguageSwitcherProps {
  isAbsolute: Boolean;
}

const LanguageSwitcher = ({ isAbsolute = false }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();
  return (
    <div className="language-switcher" id={isAbsolute && "absolute-style"}>
      <button
        onClick={() => i18n.changeLanguage("en")}
        className={i18n.language.startsWith("en") ? "active" : ""}
      >
        EN
      </button>
      <button
        onClick={() => i18n.changeLanguage("ko")}
        className={i18n.language.startsWith("ko") ? "active" : ""}
      >
        한국어
      </button>
    </div>
  );
};

export default LanguageSwitcher;
