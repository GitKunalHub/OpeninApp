const mongoose = require("mongoose");

const subtaskSchema = new mongoose.Schema(
  {
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    status: {
      type: Number,
      enum: [0, 1], // 0 - incomplete, 1 - complete
      default: 0,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Subtask = mongoose.model("Subtask", subtaskSchema);
module.exports = Subtask;
