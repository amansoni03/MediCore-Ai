import 'dart:convert';

class Task {
  final String id;
  final String title;
  final String description;
  final bool isDone;
  final DateTime createdAt;

  Task({
    required this.id,
    required this.title,
    this.description = '',
    this.isDone = false,
    required this.createdAt,
  });

  Task copyWith({
    String? title,
    String? description,
    bool? isDone,
  }) {
    return Task(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      isDone: isDone ?? this.isDone,
      createdAt: createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'isDone': isDone,
        'createdAt': createdAt.toIso8601String(),
      };

  factory Task.fromJson(Map<String, dynamic> json) => Task(
        id: json['id'] as String,
        title: json['title'] as String,
        description: (json['description'] as String?) ?? '',
        isDone: (json['isDone'] as bool?) ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  static List<Task> listFromJson(String source) {
    final List<dynamic> decoded = jsonDecode(source) as List<dynamic>;
    return decoded
        .map((e) => Task.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static String listToJson(List<Task> tasks) =>
      jsonEncode(tasks.map((t) => t.toJson()).toList());
}
