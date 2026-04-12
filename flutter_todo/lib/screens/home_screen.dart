import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../models/task.dart';
import '../widgets/task_tile.dart';
import 'add_task_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const _storageKey = 'flutter_todo_tasks';
  final _uuid = const Uuid();

  List<Task> _tasks = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  // ─── Persistence ────────────────────────────────────────────────────────────

  Future<void> _loadTasks() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    setState(() {
      _tasks = raw != null ? Task.listFromJson(raw) : [];
      _loading = false;
    });
  }

  Future<void> _saveTasks() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, Task.listToJson(_tasks));
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  void _addTask(String title, String description) {
    setState(() {
      _tasks.insert(
        0,
        Task(
          id: _uuid.v4(),
          title: title,
          description: description,
          createdAt: DateTime.now(),
        ),
      );
    });
    _saveTasks();
  }

  void _editTask(int index, String title, String description) {
    setState(() {
      _tasks[index] = _tasks[index].copyWith(
        title: title,
        description: description,
      );
    });
    _saveTasks();
  }

  void _toggleTask(int index, bool? value) {
    setState(() {
      _tasks[index] = _tasks[index].copyWith(isDone: value ?? false);
    });
    _saveTasks();
  }

  void _deleteTask(int index) {
    setState(() {
      _tasks.removeAt(index);
    });
    _saveTasks();
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  Future<void> _openAddTask() async {
    final result = await Navigator.push<Map<String, String>>(
      context,
      MaterialPageRoute(builder: (_) => const AddTaskScreen()),
    );
    if (result != null) {
      _addTask(result['title']!, result['description']!);
    }
  }

  Future<void> _openEditTask(int index) async {
    final task = _tasks[index];
    final result = await Navigator.push<Map<String, String>>(
      context,
      MaterialPageRoute(
        builder: (_) => AddTaskScreen(
          initialTitle: task.title,
          initialDescription: task.description,
        ),
      ),
    );
    if (result != null) {
      _editTask(index, result['title']!, result['description']!);
    }
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  int get _doneCount => _tasks.where((t) => t.isDone).length;

  // ─── Build ───────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Tasks'),
        centerTitle: false,
        bottom: _tasks.isEmpty
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(28),
                child: Padding(
                  padding:
                      const EdgeInsets.only(left: 16, right: 16, bottom: 8),
                  child: Row(
                    children: [
                      Text(
                        '$_doneCount / ${_tasks.length} completed',
                        style: Theme.of(context).textTheme.labelMedium?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: LinearProgressIndicator(
                          value: _doneCount / _tasks.length,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _tasks.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.only(top: 8, bottom: 100),
                  itemCount: _tasks.length,
                  itemBuilder: (context, index) => TaskTile(
                    task: _tasks[index],
                    onToggle: (val) => _toggleTask(index, val),
                    onEdit: () => _openEditTask(index),
                    onDelete: () => _deleteTask(index),
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddTask,
        icon: const Icon(Icons.add),
        label: const Text('Add Task'),
      ),
    );
  }

  Widget _buildEmptyState() {
    final colorScheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.checklist_rounded,
                size: 96, color: colorScheme.primary.withOpacity(0.25)),
            const SizedBox(height: 24),
            Text(
              'No tasks yet',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface.withOpacity(0.5),
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Tap "Add Task" to create your first task.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurface.withOpacity(0.4),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
