// src/swagger.js
import swaggerJsDoc from "swagger-jsdoc";
import * as dotenv from "dotenv";

dotenv.config();

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0", // Specify OpenAPI version
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "API Information",
      contact: {
        name: "Developer",
      },
      servers: [{ url: `http://localhost:${process.env.PORT || 3001}` }],
    },
  },
  apis: ["src/routes/**/*.ts"], // Path to your API route files
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

export default swaggerDocs;
