/// Mirrors backend `UserOut` (see gobron-backend/app/schemas/user.py).
class UserProfile {
  UserProfile({
    required this.id,
    required this.phone,
    required this.fullName,
    required this.role,
    required this.isActive,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as int,
      phone: json['phone'] as String?,
      fullName: (json['full_name'] as String?)?.trim().isNotEmpty == true
          ? json['full_name'] as String
          : null,
      role: json['role'] as String,
      isActive: json['is_active'] as bool,
    );
  }

  final int id;
  final String? phone;
  final String? fullName;
  final String role;
  final bool isActive;

  bool get isFieldOwner => role == 'field_owner';
  bool get isSuperadmin => role == 'superadmin';

  /// Both field owners and superadmins may use the owner app.
  bool get canManageFields => isFieldOwner || isSuperadmin;
}
