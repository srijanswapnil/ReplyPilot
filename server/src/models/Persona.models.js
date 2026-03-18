import mongoose from "mongoose";

const PersonaSchema=new mongoose.Schema(
    {
        userId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true,
        },
        name:{
            type:String,
            required:true,
        },
        tone:{
            type:String,
            enum:[
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
            default:'friendly'
        },
        systemPrompt:{type:String},
        vocabulary:[{type:String}],
        examples:[
            {
                commentText:{type:String},
                replyText:{type:String},
            }
        ],
        isDefault:{
            type:Boolean,
            default:false
        }
    },
    {timestamps:true}
);

export default mongoose.model('Persona',PersonaSchema);