import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'models/owner_notification.dart';
import 'notifications_repository.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>((
  ref,
) {
  return NotificationsRepository(ref.watch(apiClientProvider));
});

class NotificationsController extends AsyncNotifier<List<OwnerNotification>> {
  NotificationsRepository get _repo =>
      ref.read(notificationsRepositoryProvider);

  @override
  Future<List<OwnerNotification>> build() => _repo.list();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_repo.list);
  }
}

final notificationsControllerProvider =
    AsyncNotifierProvider<NotificationsController, List<OwnerNotification>>(
      NotificationsController.new,
    );
