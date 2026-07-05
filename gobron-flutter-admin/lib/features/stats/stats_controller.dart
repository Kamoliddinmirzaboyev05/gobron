import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'models/dashboard_stats.dart';
import 'stats_repository.dart';

final statsRepositoryProvider = Provider<StatsRepository>((ref) {
  return StatsRepository(ref.watch(apiClientProvider));
});

class StatsController extends AsyncNotifier<DashboardStats> {
  StatsRepository get _repo => ref.read(statsRepositoryProvider);

  @override
  Future<DashboardStats> build() => _repo.dashboard();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_repo.dashboard);
  }
}

final statsControllerProvider = AsyncNotifierProvider<StatsController, DashboardStats>(
  StatsController.new,
);
