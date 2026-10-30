import api from "./axios";

export const executeCode = (data) =>
  api.post("/code/execute", data);