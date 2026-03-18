import mongoose from "mongoose";

const CommentSchema=new mongoose.Schema(
    {
        ytCommentId:{
            type:String,
            required:true,
            unique:true,
            index:true,
        },
        videoId:{
            type:String,
            required:true,
            index:true,
        },
        channelId:{
            type:String,
            required:true,
        },

        text:{type:String,required:true},
        textDisplay:{type:String},
        authorName:{type:String},
        authorChannelId:{type:String},
        authorAvatar:{type:String},
        likeCount:{type:Number,default:0},
        replyCount:{type:Number,default:0},
        publishedAt:{type:Date},
        updatedAt:{type:Date},
        isReply:{type:Boolean,default:false}, //true if it's a reply to another's comment
        parentId:{type:String,default:null}, //parent ytcommentId if it's a reply to another's comment 

        intent:{
            type:String,
            enum:['question','praise','criticism','spam','neutral','pending'],
            default:'pending',
        },
        intentConfidence:{type:Number,default:null},
        isSpam:{type:Boolean,default:false},

        classificationStatus:{
            type:String,
            enum:['pending','processing','done','failed'],
            default:'pending',
            index:true
        }
    },
    {timestamps:true}
);

CommentSchema.index({videoId:1,publishedAt:-1});
CommentSchema.index({videoId:1,intent:1});

export default mongoose.model('Comment',CommentSchema);