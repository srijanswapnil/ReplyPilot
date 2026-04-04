import axios from 'axios';
import { env } from '../config/env.js';


export const classifyIntent = async (commentText, commentId = "unknown_id") => {
  try {
    const response = await axios.post(`${env.AI_SERVICE_URL}/classify`, {
      comment_id: commentId,
      text: commentText
    });
    return response.data; // Should return { "intent": "QUESTION", ... }
  } catch (error) {
    console.error("Error calling AI Service:", error);
    throw error;
  }
};