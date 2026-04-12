# Flutter To-Do App

A simple, clean Flutter To-Do app with local persistence.

## Features

- ✅ **View tasks** — list with title, optional description, created date, and completion status
- ➕ **Add task** — floating action button opens a form to enter title + description
- ✏️ **Edit task** — tap any task to update its title or description
- ☑️ **Toggle done** — circular checkbox to mark tasks complete/incomplete
- 🗑️ **Delete task** — swipe left or tap the delete icon (confirmation dialog shown)
- 💾 **Local persistence** — tasks are saved via `shared_preferences` and survive app restarts
- 🌙 **Dark mode** — follows system theme automatically
- 📊 **Progress bar** — shows how many tasks are done at a glance

## Getting Started

```bash
cd flutter_todo
flutter pub get
flutter run
```

## Project Structure

```
flutter_todo/
├── lib/
│   ├── main.dart                  # App entry point & MaterialApp
│   ├── models/
│   │   └── task.dart              # Task model (id, title, description, isDone, createdAt)
│   ├── screens/
│   │   ├── home_screen.dart       # Task list + state management + persistence
│   │   └── add_task_screen.dart   # Add / edit task form
│   └── widgets/
│       └── task_tile.dart         # Individual task card with swipe-to-delete
└── pubspec.yaml
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `shared_preferences` | Persist tasks locally as JSON |
| `uuid` | Generate unique task IDs |
| `intl` | Format creation dates |
