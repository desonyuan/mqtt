const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withCustomPackagingOptions(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents = config.modResults.contents.replace(
        /android\s*{([^}]*)}/,
        (match, group) => {
          if (!group.includes("packagingOptions")) {
            return match.replace(
              group,
              `${group.trim()}
    packagingOptions {
        resources {
            excludes.add("META-INF/*")
        }
    }`
            );
          }
          return match;
        }
      );
    }
    return config;
  });
};