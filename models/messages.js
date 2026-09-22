const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    jobId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Job', 
        required: true 
    },
    senderName: { 
        type: String, 
        required: true 
    },
    senderPhone: { 
        type: String, 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Message', MessageSchema);