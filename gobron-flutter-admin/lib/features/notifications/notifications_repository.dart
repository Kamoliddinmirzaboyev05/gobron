import '../../core/network/api_client.dart';
import 'models/owner_notification.dart';

class NotificationsRepository {
  NotificationsRepository(this._api);

  final ApiClient _api;

  Future<List<OwnerNotification>> list() async {
    final json = await _api.getList('/owner/notifications');
    return json
        .map((e) => OwnerNotification.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
