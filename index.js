const express = require("express");
const bodyParser = require("body-parser");
const { Twilio } = require("twilio");
const app = express();
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const cron = require("node-cron");
const Task = require("./models/Task");
const User = require("./models/User");

require("dotenv").config();
require("./db");
const PORT = process.env.PORT;

app.get("/", (req, res) => {
  res.json({
    message: "OpeninApp API is working",
  });
});

app.use(bodyParser.json());
app.use("/users", userRoutes);
app.use("/tasks", taskRoutes);

cron.schedule(
  "* * * * *",
  async () => {
    const today = new Date();
    try {
      const tasks = await Task.find({ deleted_at: { $exists: false } });

      tasks.forEach(async (task) => {
        const diffInDays = Math.ceil(
          (new Date(task.due_date) - today) / (1000 * 60 * 60 * 24)
        );
        let priorityDays = 3; // Default priority for tasks due in 5+ days

        if (diffInDays === 0) {
          priorityDays = 0; // Due date is today
        } else if (diffInDays <= 2) {
          priorityDays = 1; // Due date is between tomorrow and day after tomorrow
        } else if (diffInDays <= 4) {
          priorityDays = 2; // Due date is within 3-4 days
        }

        task.priority = priorityDays;
        await task.save();
      });

      console.log("Priority update cron job ran successfully.");
    } catch (err) {
      console.error("Error running priority update cron job:", err);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata", // Set your timezone here, e.g., 'America/New_York'
  }
);

// Cron job to run everyday at midnight
cron.schedule(
  "* * * * *", // Run every minute (for demonstration purposes, adjust as needed)
  async () => {
    try {
      const today = new Date();

      // Fetch tasks that have passed their due date
      const overdueTasks = await Task.find({
        due_date: {
          $lte: today.toISOString().slice(0, 10), // Compare date part only
        },
      }).populate("owner");

      // Group tasks by user priority
      const priorityTasks = {};
      overdueTasks.forEach((task) => {
        if (!priorityTasks[task.owner.priority]) {
          priorityTasks[task.owner.priority] = [];
        }
        priorityTasks[task.owner.priority].push(task);
      });

      //   Iterate over user priorities in ascending order
      for (let priority = 2; priority >= 0; priority--) {
        if (priorityTasks[priority]) {
          for (const task of priorityTasks[priority]) {
            // Make voice call

            const accountSid = process.env.TWILIO_SSID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const twilioClient = new Twilio(accountSid, authToken);

            await twilioClient.calls.create({
              url: "http://demo.twilio.com/docs/voice.xml", // TwiML URL
              to: task.owner.phonenumber,
              from: process.env.TWILIO_PHONE_NUMBER,
            });

            console.log(
              `Voice call made to ${task.owner.phonenumber} for task "${task.title}"`
            );

            // Break the loop after making the call
            break;
          }
        }
      }

      console.log("All voice calls made successfully");
    } catch (err) {
      console.error("Error making voice calls:", err);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata", // Update with your timezone
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
