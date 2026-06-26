import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { tasksTable } from "./tasks";
import { projectsTable } from "./projects";

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  taskTitle: text("task_title").notNull(),
  action: text("action").notNull(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  projectName: text("project_name").notNull(),
  assigneeName: text("assignee_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Activity = typeof activityTable.$inferSelect;
