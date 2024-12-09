export default {
    testEnvironment: "node",
    // extensionsToTreatAsEsm: [".js"],
    transform: {
        "^.+\\.m?js$": ["babel-jest", { presets: ["@babel/preset-env"] }],
    },
};
