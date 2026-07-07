import '../../core/network/api_client.dart';
import 'models/dashboard_stats.dart';

class StatsRepository {
  StatsRepository(this._api);

  final ApiClient _api;

  Future<DashboardStats> dashboard() async {
    final json = await _api.get('/owner/stats/summary');
    return DashboardStats.fromJson(json);
  }
}
