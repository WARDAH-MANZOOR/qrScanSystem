export default {
    testEnvironment: "node",
    // extensionsToTreatAsEsm: [".js"],
    transform: {
        "^.+\\.m?js$": ["babel-jest", { presets: ["@babel/preset-env"] }],
    },
};
// export default {
//   testEnvironment: "node",
//   transform: {
//       "^.+\\.m?[tj]s$": ["babel-jest", { presets: ["@babel/preset-env"] }],
//   },
//   extensionsToTreatAsEsm: [".ts", ".mts"], // Remove `.mjs`
//   moduleNameMapper: {
//       "^(\\.{1,2}/.*)\\.js$": "$1", 
//   },
// };

