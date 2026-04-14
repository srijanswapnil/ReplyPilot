import mongoose from "mongoose";

const PersonaSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        tone: {
            type: String,
            enum: [
                'friendly',
                'professional',
                'humorous',
                'promotional',
                'appreciative',
                'informative',
                'supportive',
                'apologetic',
                'neutral'
            ],
            default: 'friendly'
        },
        creatorBio: { type: String,default: null },
        // Words/phrases the creator naturally uses
        // Injected into the prompt: "Use these naturally: bhai, let's gooo"
        vocabulary: [{ type: String }],
    },
    { timestamps: true }
);

export default mongoose.model('Persona', PersonaSchema);