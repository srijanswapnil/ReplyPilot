import api from './axios';

const handleReplyError = (error, action) => {
  const message = error.response?.data?.message || error.message || "Failed to process reply action";
  console.error(`[Reply Service] Error during ${action}:`, message);
  throw error;
};

export const listReplies = async (params = {}) => {
  try {
    const response = await api.get('/api/replies', { params });
    return response.data;
  } catch (error) {
    handleReplyError(error, 'listReplies');
  }
};

export const getReply = async (id) => {
  try {
    const response = await api.get(`/api/replies/${id}`);
    return response.data.data;
  } catch (error) {
    handleReplyError(error, 'getReply');
  }
};

/**
 * Triggers the initial AI generation for a specific comment
 */
export const generateReply = async (commentId) => {
  try {
    const response = await api.post(`/api/replies/generate/${commentId}`);
    return response.data;
  } catch (error) {
    handleReplyError(error, 'generateReply');
  }
};

/**
 * Allows the creator to manually tweak the AI's draft
 */
export const editReply = async (id, text) => {
  try {
    const response = await api.put(`/api/replies/${id}/edit`, { text });
    return response.data;
  } catch (error) {
    handleReplyError(error, 'editReply');
  }
};

export const approveReply = async (id) => {
  try {
    const response = await api.put(`/api/replies/${id}/approve`);
    return response.data;
  } catch (error) {
    handleReplyError(error, 'approveReply');
  }
};

export const rejectReply = async (id) => {
  try {
    const response = await api.put(`/api/replies/${id}/reject`);
    return response.data;
  } catch (error) {
    handleReplyError(error, 'rejectReply');
  }
};

export const publishReply = async (id) => {
  try {
    const response = await api.put(`/api/replies/${id}/publish`);
    return response.data;
  } catch (error) {
    handleReplyError(error, 'publishReply');
  }
};

/**
 * Re-runs the LLM if the first draft wasn't satisfactory
 */
export const regenerateReply = async (id) => {
  try {
    const response = await api.post(`/api/replies/${id}/regenerate`);
    return response.data;
  } catch (error) {
    handleReplyError(error, 'regenerateReply');
  }
};