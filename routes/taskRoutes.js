const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Task = require("../models/Task");
const User = require("../models/User");

router.get("/test", auth, (req, res) => {
  res.json({
    message: "Task routes working",
    user: req.user,
  });
});

// CRUD tasks for authenticated users

// creating a task
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, due_date } = req.body;
    const today = new Date();
    const diffInDays = Math.ceil(
      (new Date(due_date) - today) / (1000 * 60 * 60 * 24)
    );
    let priorityDays = 3; // Default priority for tasks due in 5+ days

    if (diffInDays === 0) {
      priorityDays = 0; // Due date is today
    } else if (diffInDays <= 2) {
      priorityDays = 1; // Due date is between tomorrow and day after tomorrow
    } else if (diffInDays <= 4) {
      priorityDays = 2; // Due date is within 3-4 days
    }

    req.user.priority = priorityDays;
    await req.user.save();

    const task = new Task({
      ...req.body,
      owner: req.user._id,
      priority: priorityDays,
    });
    await task.save();
    res.status(201).json({ task, message: "Task Created Success" });
  } catch (err) {
    return res.json({ error: err });
  }
});

// create subtask
router.post("/:taskId/subtasks", auth, async (req, res) => {
  const taskId = req.params.taskId;
  try {
    const task = await Task.findOne({
      _id: taskId,
      owner: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.subtasks.push(req.body);
    await task.save();

    res.status(201).json({
      task,
      message: "Subtask Created Successfully",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// get user tasks with filters and pagination
router.get("/", auth, async (req, res) => {
  const { priority, due_date, page = 1, limit = 10 } = req.query;
  const filters = { owner: req.user._id };
  if (priority) {
    filters.priority = priority;
  }
  if (due_date) {
    filters.due_date = due_date;
  }

  try {
    const tasks = await Task.find(filters)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ due_date: 1 }); // Sort by due date in ascending order

    res.status(200).json({
      tasks,
      count: tasks.length,
      message: "Tasks fetched successfully",
    });
  } catch (err) {
    return res.status(400).json({ error: err });
  }
});

// get all subtasks with filter taskId
router.get("/:taskId/subtasks", auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      owner: req.user._id,
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json({
      subtasks: task.subtasks,
      count: task.subtasks.length,
      message: "Subtasks fetched successfully",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// update task due_date and status
router.patch("/:id/due_date_status", auth, async (req, res) => {
  const taskId = req.params.id;
  const { due_date, status } = req.body;

  const today = new Date();
  const diffInDays = Math.ceil(
    (new Date(due_date) - today) / (1000 * 60 * 60 * 24)
  );
  let priorityDays = 3; // Default priority for tasks due in 5+ days

  if (diffInDays === 0) {
    priorityDays = 0; // Due date is today
  } else if (diffInDays <= 2) {
    priorityDays = 1; // Due date is between tomorrow and day after tomorrow
  } else if (diffInDays <= 4) {
    priorityDays = 2; // Due date is within 3-4 days
  }

  try {
    const task = await Task.findOne({
      _id: taskId,
      owner: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (status && !["TODO", "DONE"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value. Status can only be 'TODO' or 'DONE'",
      });
    }

    task.due_date = due_date || task.due_date;
    task.status = status || task.status;
    task.priority = priorityDays || task.priority;

    await task.save();

    const priorityUser = User.priority;
    priorityUser = priorityDays;

    await priorityUser.save();

    res.status(200).json({
      task,
      message: "Task due date and status updated successfully",
    });
  } catch (err) {
    return res.status(500).json({ error: err });
  }
});

//update status of subtask

router.patch("/:taskId/subtasks/:subtaskId", auth, async (req, res) => {
  const taskId = req.params.taskId;
  const subtaskId = req.params.subtaskId;
  const updates = Object.keys(req.body);
  const allowedUpdates = ["status"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).json({ message: "Invalid Updates" });
  }

  const { status } = req.body;
  if (status !== 0 && status !== 1) {
    return res.status(400).json({ message: "Status must be 0 or 1" });
  }

  try {
    const task = await Task.findOne({
      _id: taskId,
      owner: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const subtaskToUpdate = task.subtasks.id(subtaskId);
    if (!subtaskToUpdate) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    subtaskToUpdate.status = status;
    await task.save();

    res.json({ task, message: "Subtask status updated successfully" });
  } catch (err) {
    return res.status(500).json({ error: err });
  }
});

// soft delete a Task by task id
router.delete("/:id", auth, async (req, res) => {
  const taskId = req.params.id;
  try {
    const task = await Task.findOne({
      _id: taskId,
      owner: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.deleted_at = new Date();
    await task.save();

    res.json({ task, message: "Task soft deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err });
  }
});

// soft delete a subtask by task id and subtask id
router.delete("/:taskId/subtasks/:subtaskId", auth, async (req, res) => {
  const taskId = req.params.taskId;
  const subtaskId = req.params.subtaskId;
  try {
    const task = await Task.findOne({
      _id: taskId,
      owner: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const subtaskToDelete = task.subtasks.id(subtaskId);
    if (!subtaskToDelete) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    subtaskToDelete.deleted_at = new Date();
    await task.save();

    res.json({ task, message: "Subtask soft deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err });
  }
});

module.exports = router;
