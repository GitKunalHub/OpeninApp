const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true, unique: true },
    due_date: { type: String, required: true },
    priority: { type: Number, required: true, enum: [0, 1, 2, 3] },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "DONE"],
      default: "TODO",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    deleted_at: { type: Date },
    subtasks: [
      {
        status: Number,
        created_at: Date,
        updated_at: Date,
        deleted_at: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model("Task", taskSchema);
module.exports = Task;
