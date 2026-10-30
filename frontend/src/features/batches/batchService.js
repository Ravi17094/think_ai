import courseApiClient from '../../services/courseApiClient'

export const getBatchesApi = () => {
  return courseApiClient.get('/batches')
}

export const getBatchByIdApi = (id) => {
  return courseApiClient.get(`/batches/${id}`)
}

export const createBatchApi = (batchData) => {
  return courseApiClient.post('/batches', batchData)
}

export const updateBatchApi = (id, batchData) => {
  return courseApiClient.put(`/batches/${id}`, batchData)
}

export const patchBatchApi = (id, batchData) => {
  return courseApiClient.patch(`/batches/${id}`, batchData)
}

export const deleteBatchApi = (id) => {
  return courseApiClient.delete(`/batches/${id}`)
}