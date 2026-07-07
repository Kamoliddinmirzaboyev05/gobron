class OwnerNotification {
  const OwnerNotification({
    required this.id,
    required this.text,
    required this.imageUrl,
    required this.audience,
    required this.status,
    required this.createdAt,
  });

  factory OwnerNotification.fromJson(Map<String, dynamic> json) {
    return OwnerNotification(
      id: json['id'] as int,
      text: json['text'] as String,
      imageUrl: json['image_url'] as String?,
      audience: json['audience'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  final int id;
  final String text;
  final String? imageUrl;
  final String audience;
  final String status;
  final DateTime createdAt;
}
