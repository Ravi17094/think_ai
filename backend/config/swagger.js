const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Thinkz AI LMS Backend API",
      version: "1.0.0",
      description: "Thinkz AI is a comprehensive technology upskilling ecosystem, inspired by structured platforms like GeeksforGeeks. It enables learners to master modern tech skills through self-paced articles, structured video courses, interactive live cohorts, coding practice, assessments, and verified certifications."
    },
    servers: [
      {
        url: "http://localhost:5000"
      }
    ]
  },
  apis: ["./routes/*.js"]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;