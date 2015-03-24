// MUST be loaded after loader.js and wrapper.js
(function (GLOBAL) {

  xtiger.defaults.locales = {};

  _setLocale = function (lang) {
    xtiger.defaults.locale = lang;
  }

  _addLocale = function (lang, defs) {
    if (typeof xtiger.defaults.locales[lang] === "undefined") {
      xtiger.defaults.locales[lang] = {};
    }
    $axel.extend(xtiger.defaults.locales[lang], defs, false, true);
  }

  // see also xtiger.util.getLocaleString in defaultbrowser.js

  GLOBAL.$axel.addLocale = _addLocale;
  GLOBAL.$axel.setLocale = _setLocale;

}(window));
