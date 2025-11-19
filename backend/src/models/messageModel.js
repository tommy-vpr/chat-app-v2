// backend/models/messageModel.js (Enhanced)
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver ID is required"],
    },
    text: {
      type: String,
      default: "",
      maxlength: [5000, "Message cannot exceed 5000 characters"],
      trim: true,
    },
    image: {
      type: String,
      default: "",
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Image must be a valid URL",
      },
    },
    imagePublicId: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Validate that at least one of text or image is provided
messageSchema.pre("validate", function (next) {
  if (!this.text && !this.image) {
    this.invalidate("text", "Message must contain text or image");
  }
  next();
});

// Indexes for performance
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ receiverId: 1, read: 1 });

export default mongoose.model("Message", messageSchema);

// import mongoose from "mongoose";

// const messageSchema = new mongoose.Schema(
//   {
//     senderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     receiverId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     text: {
//       type: String,
//       default: "",
//     },
//     image: {
//       type: String,
//       default: "",
//     },
//     imagePublicId: {
//       type: String,
//       default: "",
//     },
//     read: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// // Indexes for performance
// messageSchema.index({ senderId: 1, receiverId: 1 });
// messageSchema.index({ createdAt: -1 });
// messageSchema.index({ receiverId: 1, read: 1 }); // For unread messages

// export default mongoose.model("Message", messageSchema);
