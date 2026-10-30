import api from "./axios";

export const generateCertificate = (enrollmentId) =>
  api.post(`/certificates/generate/${enrollmentId}`);

export const getCertificateByEnrollment = (enrollmentId) =>
  api.get(`/certificates/enrollment/${enrollmentId}`);

export const downloadCertificateUrl = (certificateNo) =>
  `${api.defaults.baseURL}/certificates/${certificateNo}/download`;

export const verifyCertificate = (certificateNo) =>
  api.get(`/certificates/verify/${certificateNo}`);